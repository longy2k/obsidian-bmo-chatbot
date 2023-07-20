import { App, Notice, PluginSettingTab, Setting, ColorComponent, requestUrl, TextComponent } from 'obsidian';
import { BMOSettings, DEFAULT_SETTINGS } from './main';
import { colorToHex } from "./view";
import BMOGPT from './main';
import { clearInterval } from 'timers';

export class BMOSettingTab extends PluginSettingTab {
	plugin: BMOGPT;

	constructor(app: App, plugin: BMOGPT) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async fetchData() {
		const url = 'http://localhost:8080/v1/models';
	
		try {
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
	
			const jsonData = response.json;
	
			const models = jsonData.data.map((model: { id: any; }) => model.id);
	
			// Store models array in your plugin settings or state
			this.plugin.settings.models = models;  
	
			return models;
	
		} catch (error) {
			// console.error('Error:', error);
		}
	}

	async display(): Promise<void> {
		const models = await this.fetchData();

		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'BMO Chatbot Settings'});

		const usageText = containerEl.createEl("p", {
		    text: "Check usage: ",
		});

		const statusText = containerEl.createEl("p", {
		    text: "Check status: ",
		});
		
		const usageLink = containerEl.createEl("a", {
				text: "https://platform.openai.com/account/usage",
				href: "https://platform.openai.com/account/usage",
		});

		const statusLink = containerEl.createEl("a", {
			text: "https://status.openai.com/",
			href: "https://status.openai.com/",
		});

		usageText.appendChild(usageLink);
		statusText.appendChild(statusLink);

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Insert API Key from OpenAI.')
			.addText(text => text
				.setPlaceholder('insert-api-key')
				.setValue(this.plugin.settings.apiKey ? `${this.plugin.settings.apiKey.slice(0, 2)}-...${this.plugin.settings.apiKey.slice(-4)}` : "")
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model')
			.setDesc('Choose a model.')
			.addDropdown(dropdown => {
				dropdown
					.addOption('gpt-3.5-turbo', 'gpt-3.5-turbo')
					.addOption('gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k')
					.addOption('gpt-4', 'gpt-4')
					if (this.plugin.settings.restAPIUrl) {
						if (models && models.length > 0) {
							models.forEach((model: string) => {
							dropdown.addOption(model, model);
							});
						}
					}
				dropdown.setValue(this.plugin.settings.model || DEFAULT_SETTINGS.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
					const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
					if (modelName) {
						modelName.textContent = 'Model: ' + this.plugin.settings.model.toLowerCase();
					}
				})
			});
	  
		new Setting(containerEl)
		.setName('System')
		.setDesc('System role prompt.')
		.addTextArea(text => text
			.setPlaceholder('You are a helpful assistant.')
			.setValue(this.plugin.settings.system_role !== undefined ? this.plugin.settings.system_role : "You are a helpful assistant who responds in markdown.")
			.onChange(async (value) => {
				this.plugin.settings.system_role = value !== undefined ? value : DEFAULT_SETTINGS.system_role;
				await this.plugin.saveSettings();
			})
		);

		new Setting(containerEl)
			.setName('Max Tokens')
			.setDesc(descLink('The maximum number of tokens, or words, that the model is allowed to generate in its output (Max Token: 4096)', 'https://platform.openai.com/tokenizer'))
			.addText(text => text
				.setPlaceholder('4096')
				.setValue(this.plugin.settings.max_tokens)
				.onChange(async (value) => {
					this.plugin.settings.max_tokens = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Temperature controls how random the generated output is. Lower values (closer to 0) make the text more predictable, while higher values (closer to 1) make it more creative and unpredictable.')
			.addText(text => text
				.setPlaceholder('1')
				.setValue(this.plugin.settings.temperature || DEFAULT_SETTINGS.temperature)
				.onChange(async (value) => {
					this.plugin.settings.temperature = value;
					await this.plugin.saveSettings();
				})
		);

		function descLink(text: string, link: string): DocumentFragment {
				const frag = new DocumentFragment();
				const desc = document.createElement('span');
				desc.innerText = text + ' ';
				frag.appendChild(desc);

				const anchor = document.createElement('a');
				anchor.href = link;
				anchor.target = '_blank';
				anchor.rel = 'noopener noreferrer';
				anchor.innerText = 'https://platform.openai.com/tokenizer';
				frag.appendChild(anchor);

				return frag;
		};

		containerEl.createEl('h2', {text: 'Appearance'});

		new Setting(containerEl)
        .setName('User Name')
        .setDesc('Create a username.')
        .addText(text => text
            .setPlaceholder('Enter user name')
            .setValue(this.plugin.settings.userName || DEFAULT_SETTINGS.userName)
            .onChange(async (value) => {
				this.plugin.settings.userName = value ? value.toUpperCase() : DEFAULT_SETTINGS.userName;
				text.inputEl.maxLength = 30;
				await this.plugin.saveSettings();
				const userNames = document.querySelectorAll('#userName') as NodeListOf<HTMLHeadingElement>;
				userNames.forEach(userName => {
					userName.textContent = this.plugin.settings.userName;
				});
            })
        );

		new Setting(containerEl)
        .setName('Chatbot Name')
        .setDesc('Name your chatbot.')
        .addText(text => text
            .setPlaceholder('Enter chatbot name')
            .setValue(this.plugin.settings.chatbotName || DEFAULT_SETTINGS.chatbotName)
            .onChange(async (value) => {
				this.plugin.settings.chatbotName = value ? value.toUpperCase() : DEFAULT_SETTINGS.chatbotName;
				text.inputEl.maxLength = 30;
				await this.plugin.saveSettings();
				const chatbotNameHeading = document.querySelector('#chatbotNameHeading') as HTMLHeadingElement;
				const chatbotNames = document.querySelectorAll('#chatbotName') as NodeListOf<HTMLHeadingElement>;
				if (chatbotNameHeading) {
					chatbotNameHeading.textContent = this.plugin.settings.chatbotName;
				}
				chatbotNames.forEach(chatbotName => {
					chatbotName.textContent = this.plugin.settings.chatbotName;
				});
            })
        );		
		
		let textInput: TextComponent;

		new Setting(containerEl)
			.setName('Background Color for Chatbot Container')
			.setDesc('Modify the background color of the chatbotContainer element.')
			.addButton(button => button
				.setButtonText("Restore Default")
				.setIcon("rotate-cw")
				.setClass("clickable-icon")
				.onClick(async () => {
					let defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim());
			
					const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
					if (chatbotContainer) {
						chatbotContainer.style.backgroundColor = defaultValue;
					}
			
					textInput.setValue(defaultValue);
			
					this.plugin.settings.chatbotContainerBackgroundColor = defaultValue;
					await this.plugin.saveSettings();
				})
		  	)
			.addText(text => {
				textInput = text;
				text
				.setPlaceholder('')
				.setValue(this.plugin.settings.chatbotContainerBackgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.chatbotContainerBackgroundColor = value;
					const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
					if (chatbotContainer) {
					chatbotContainer.style.backgroundColor = value;
					}
					await this.plugin.saveSettings();
				})
			});

			let textInput2: TextComponent;
			
			new Setting(containerEl)
				.setName('Background color for User Message')
				.setDesc('Modify the background color of the userMessage element.')
				.addButton(button => button
					.setButtonText("Restore Default")
					.setIcon("rotate-cw")
					.setClass("clickable-icon")
					.onClick(async () => {
						const defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
			
						const messageContainer = document.querySelector('#messageContainer');
						if (messageContainer) {
							const userMessages = messageContainer.querySelectorAll('.userMessage');
							userMessages.forEach((userMessage) => {
								const element = userMessage as HTMLElement;
								element.style.backgroundColor = defaultValue;
							});
							textInput2.setValue(defaultValue);
							this.plugin.settings.userMessageBackgroundColor = defaultValue;
							await this.plugin.saveSettings();
						}
					})
				)
				.addText(text => {
					textInput2 = text;
					text
					.setPlaceholder('')
					.setValue(this.plugin.settings.userMessageBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.userMessageBackgroundColor = value;
						const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
						if (messageContainer) {
							const userMessages = messageContainer.querySelectorAll('.userMessage');
							userMessages.forEach((userMessage) => {
								const element = userMessage as HTMLElement;
								element.style.backgroundColor = value;
							})
							await this.plugin.saveSettings();
						}
					});
				});
			
			let textInput3: TextComponent;

			new Setting(containerEl)
				.setName('Background color for Bot Message')
				.setDesc('Modify the background color of the botMessage element.')
				.addButton(button => button
					.setButtonText("Restore Default")
					.setIcon("rotate-cw")
					.setClass("clickable-icon")
					.onClick(async () => {
						const defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
			
						const messageContainer = document.querySelector('#messageContainer');
						if (messageContainer) {
							const botMessages = messageContainer.querySelectorAll('.botMessage');
							botMessages.forEach((botMessage) => {
								const element = botMessage as HTMLElement;
								element.style.backgroundColor = defaultValue;
							})
							textInput3.setValue(defaultValue);
							this.plugin.settings.botMessageBackgroundColor = defaultValue;
							await this.plugin.saveSettings();
						}
					})
				)
				.addText(text => {
					textInput3 = text;
					text
					.setPlaceholder('')
					.setValue(this.plugin.settings.botMessageBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.botMessageBackgroundColor = value;
						const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
						if (messageContainer) {
							const userMessages = messageContainer.querySelectorAll('.botMessage');
							userMessages.forEach((botMessage) => {
								const element = botMessage as HTMLElement;
								element.style.backgroundColor = value;
							})
							await this.plugin.saveSettings();
						}
					});
				});
				

		containerEl.createEl('h2', {text: 'Advanced'});

		new Setting(containerEl)
		.setName('REST API URL')
		.setDesc(descLink1('Enter your REST API URL from a self-hosted API like', 'https://github.com/go-skynet/LocalAI', ''))
		.addText(text => text
		.setPlaceholder('http://localhost:8080')
		.setValue(this.plugin.settings.restAPIUrl || DEFAULT_SETTINGS.restAPIUrl)
		.onChange(async (value) => {
			this.plugin.settings.restAPIUrl = value ? value : DEFAULT_SETTINGS.restAPIUrl;
			await this.plugin.saveSettings();
		})
		);

		function descLink1(text: string, link: string, extraWords: string): DocumentFragment {
			const frag = new DocumentFragment();
			const desc = document.createElement('span');
			desc.innerText = text + ' ';
			frag.appendChild(desc);
		
			const anchor = document.createElement('a');
			anchor.href = link;
			anchor.target = '_blank';
			anchor.rel = 'noopener noreferrer';
			anchor.innerText = 'LocalAI';
			frag.appendChild(anchor);
		
			const extra = document.createElement('span');
			extra.innerText = ' ' + extraWords;
			frag.appendChild(extra);
		
			return frag;
		};
	}
}
