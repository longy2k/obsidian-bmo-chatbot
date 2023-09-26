import { App, PluginSettingTab, Setting, ColorComponent, requestUrl } from 'obsidian';
import { DEFAULT_SETTINGS } from './main';
import BMOGPT from './main';

export class BMOSettingTab extends PluginSettingTab {
	plugin: BMOGPT;

	constructor(app: App, plugin: BMOGPT) {
		super(app, plugin);
		this.plugin = plugin;
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

		containerEl.createEl('h2', {text: 'General'});

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Insert API Key from OpenAI or Anthropic. You may need to refresh the tab after inserting.')
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
				if (this.plugin.settings.apiKey) {
					if (this.plugin.settings.apiKey.startsWith("sk-ant")) {
						dropdown
						.addOption('claude-instant-1.2', 'claude-instant-1.2')
						.addOption('claude-2.0', 'claude-2.0')
					}
					else {
						dropdown
						.addOption('gpt-3.5-turbo', 'gpt-3.5-turbo')
						.addOption('gpt-3.5-turbo-16k', 'gpt-3.5-turbo-16k')
						.addOption('gpt-4', 'gpt-4')
					}
				}
				if (this.plugin.settings.restAPIUrl && models && models.length > 0) {
					models.forEach((model: string) => {
						dropdown.addOption(model, model);
					});
				}
			dropdown
				.setValue(this.plugin.settings.model || DEFAULT_SETTINGS.model)
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
			.setDesc(descLink('The maximum number of tokens, or words, that the model is allowed to generate in its output.', 'https://platform.openai.com/tokenizer'))
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
		.setDesc('Temperature controls how random the generated output is. Lower values make the text more predictable, while higher values make it more creative and unpredictable.')
		.addSlider(slider => slider
			.setLimits(0, 1, 0.05)
			.setValue(this.plugin.settings.temperature !== undefined ? this.plugin.settings.temperature : DEFAULT_SETTINGS.temperature)
			.setDynamicTooltip()
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
				anchor.innerText = '(https://platform.openai.com/tokenizer)';
				frag.appendChild(anchor);

				return frag;
		}

		new Setting(containerEl)
		.setName('Allow Reference Current Note')
		.setDesc('Allow chatbot to reference current active note during conversation.')
		.addToggle((toggle) =>
			toggle.setValue(this.plugin.settings.referenceCurrentNote).onChange((value) => {
				this.plugin.settings.referenceCurrentNote = value;
				this.plugin.saveSettings();

				const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
				if (referenceCurrentNoteElement) {
					if (value) {
						referenceCurrentNoteElement.style.display = 'block';
					} else {
						referenceCurrentNoteElement.style.display = 'none';
					}
				}
			})
		);

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

		let colorPicker1: ColorComponent;
		const defaultUserMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim();
		
		new Setting(containerEl)
			.setName('Background color for User Messages')
			.setDesc('Modify the background color of the userMessage element.')
			.addButton(button => button
				.setButtonText("Restore Default")
				.setIcon("rotate-cw")
				.setClass("clickable-icon")
				.onClick(async () => {
					const defaultValue = colorToHex(defaultUserMessageBackgroundColor);
					colorPicker1.setValue(defaultValue);
		
					const messageContainer = document.querySelector('#messageContainer');
					if (messageContainer) {
						const userMessages = messageContainer.querySelectorAll('.userMessage');
						userMessages.forEach((userMessage) => {
							const element = userMessage as HTMLElement;
							element.style.backgroundColor = defaultValue;
						});
						await this.plugin.saveSettings();
					}
				})
			)
			.addColorPicker((color) => {
				colorPicker1 = color;

				let defaultValue = this.plugin.settings.userMessageBackgroundColor;

				if (this.plugin.settings.userMessageBackgroundColor == "--background-primary") {
					defaultValue = colorToHex(defaultUserMessageBackgroundColor);
				}

				color.setValue(defaultValue)
				.onChange(async (value) => {
					const hexValue = colorToHex(value);
					this.plugin.settings.userMessageBackgroundColor = hexValue;
					const messageContainer = document.querySelector('#messageContainer');
					if (messageContainer) {
						const userMessages = messageContainer.querySelectorAll('.userMessage');
						userMessages.forEach((userMessage) => {
							const element = userMessage as HTMLElement;
							element.style.backgroundColor = hexValue;
						});
					}

					await this.plugin.saveSettings();
				});
			});		
			
			let colorPicker2: ColorComponent;
			const defaultBotMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim();

			new Setting(containerEl)
				.setName('Background color for Bot Messages')
				.setDesc('Modify the background color of the botMessage element.')
				.addButton(button => button
					.setButtonText("Restore Default")
					.setIcon("rotate-cw")
					.setClass("clickable-icon")
					.onClick(async () => {
						const defaultValue = colorToHex(defaultBotMessageBackgroundColor);
						colorPicker2.setValue(defaultValue);
			
						const messageContainer = document.querySelector('#messageContainer');
						if (messageContainer) {
							const botMessages = messageContainer.querySelectorAll('.botMessage');
							botMessages.forEach((botMessage) => {
								const element = botMessage as HTMLElement;
								element.style.backgroundColor = defaultValue;
							});
							await this.plugin.saveSettings();
						}
					})
				)
				.addColorPicker((color) => {
					colorPicker2 = color;

					let defaultValue = this.plugin.settings.botMessageBackgroundColor;
	
					if (this.plugin.settings.botMessageBackgroundColor == "--background-secondary") {
						defaultValue = colorToHex(defaultBotMessageBackgroundColor);
					}

					color.setValue(defaultValue)
						.onChange(async (value) => {
							const hexValue = colorToHex(value);
							this.plugin.settings.botMessageBackgroundColor = hexValue;
							const messageContainer = document.querySelector('#messageContainer');
							if (messageContainer) {
								const botMessages = messageContainer.querySelectorAll('.botMessage');
								botMessages.forEach((botMessage) => {
									const element = botMessage as HTMLElement;
									element.style.backgroundColor = hexValue;
								});
							}
					await this.plugin.saveSettings();
				});
			});
				

		containerEl.createEl('h2', {text: 'Advanced'});

		new Setting(containerEl)
		.setName('REST API URL')
		.setDesc(descLink1('Enter your REST API URL using', 'https://github.com/go-skynet/LocalAI', ''))
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
		}
	}

	async fetchData() {
		const restAPIUrl = this.plugin.settings.restAPIUrl;

		if (!restAPIUrl) {
			return;
		}
	
		const url = restAPIUrl + '/v1/models';
	
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

			this.plugin.settings.models = models;  
	
			return models;
	
		} catch (error) {
			console.error('Error:', error);
		}
	}
}

export function colorToHex(colorValue: string): string {
    if (colorValue.startsWith("hsl")) {
      // Convert HSL to HEX
      const match = colorValue.match(/(\d+(\.\d+)?)%?/g);
      if (match === null || match.length < 3) {
		throw new Error("Invalid HSL value");
	}

      const h = parseInt(match[0]) / 360;
      const s = parseInt(match[1]) / 100;
      const l = parseInt(match[2]) / 100;
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1 / 3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1 / 3);
  
      const toHex = function (c: number) {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
  
      const hex = "#" + toHex(r) + toHex(g) + toHex(b);
      return hex;
    } else if (colorValue.startsWith("rgb")) {
      // Convert RGB to HEX
      const sep = colorValue.indexOf(",") > -1 ? "," : " ";
      const rgbArray = colorValue.substr(4).split(")")[0].split(sep);
  
      let r = (+rgbArray[0]).toString(16),
        g = (+rgbArray[1]).toString(16),
        b = (+rgbArray[2]).toString(16);
  
      if (r.length == 1)
        r = "0" + r;
      if (g.length == 1)
        g = "0" + g;
      if (b.length == 1)
        b = "0" + b;
  
      return "#" + r + g + b;
    } else {
      // If the colorValue is neither RGB nor HSL, return the input
      return colorValue;
    }
}

function hue2rgb(p: number, q: number, t: number) {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}