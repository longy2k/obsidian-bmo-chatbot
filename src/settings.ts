import { App, Notice, PluginSettingTab, Setting, ColorComponent, requestUrl } from 'obsidian';
import { BMOSettings, DEFAULT_SETTINGS } from './main';
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
			console.error('Error:', error);
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
					.addOption('gpt-3.5-turbo-0301', 'gpt-3.5-turbo-0301')
					.addOption('gpt-4-0314', 'gpt-4-0314 (Access depends on your API key.)')
					if (models && models.length > 0) {
						models.forEach((model: string) => {
						  dropdown.addOption(model, model);
						});
					}
				dropdown.setValue(this.plugin.settings.model || DEFAULT_SETTINGS.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
					const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
					if (modelName) {
						modelName.textContent = 'Model: ' + this.plugin.settings.model.replace(/[gpt]/g, letter => letter.toUpperCase());
					}
				})
			});
	  
		new Setting(containerEl)
			.setName('System')
			.setDesc('System role prompt.')
			.addTextArea(text => text
				.setPlaceholder('You are a helpful assistant.')
				.setValue(this.plugin.settings.system_role || DEFAULT_SETTINGS.system_role)
				.onChange(async (value) => {
					this.plugin.settings.system_role = value || DEFAULT_SETTINGS.system_role;
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
		
		function colorToHex(colorValue: string): string {
			if (colorValue.startsWith("hsl")) {
			  // Convert HSL to HEX
			  var match = colorValue.match(/(\d+(\.\d+)?)%?/g);
			  if (match === null || match.length < 3) {
				throw new Error("Invalid HSL value");
			  }
			  var h = parseInt(match[0]) / 360;
			  var s = parseInt(match[1]) / 100;
			  var l = parseInt(match[2]) / 100;
		  
			  function hue2rgb(p: number, q: number, t: number) {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			  }
		  
			  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			  var p = 2 * l - q;
			  var r = hue2rgb(p, q, h + 1 / 3);
			  var g = hue2rgb(p, q, h);
			  var b = hue2rgb(p, q, h - 1 / 3);
		  
			  var toHex = function (c: number) {
				var hex = Math.round(c * 255).toString(16);
				return hex.length === 1 ? "0" + hex : hex;
			  };
		  
			  var hex = "#" + toHex(r) + toHex(g) + toHex(b);
			  return hex;
			} else if (colorValue.startsWith("rgb")) {
			  // Convert RGB to HEX
			  let sep = colorValue.indexOf(",") > -1 ? "," : " ";
			  let rgbArray = colorValue.substr(4).split(")")[0].split(sep);
		  
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
		  

		
		// Your existing code starts here...
		let colorPicker: ColorComponent;
		let pollingInterval: string | number | NodeJS.Timer | undefined;
		
		new Setting(containerEl)
			.setName('Background Color for Chatbot Container')
			.setDesc('Modify the background color of the chatbotContainer element.')
			.addButton(button => button
				.setButtonText("Restore Default")
				.setIcon("rotate-cw")
				.setClass("clickable-icon")
				.onClick(async () => {
					let defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim());
					colorPicker.setValue(defaultValue);
		
					const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
					if (chatbotContainer) {
						chatbotContainer.style.backgroundColor = defaultValue;
					}
		
					this.plugin.settings.chatbotContainerBackgroundColor = defaultValue;
					await this.plugin.saveSettings();
				})
			)
			.addColorPicker((color) => {
				colorPicker = color;
				color.setValue(colorToHex(this.plugin.settings.chatbotContainerBackgroundColor) || colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim()))
					.onChange(async (value) => {
						this.plugin.settings.chatbotContainerBackgroundColor = colorToHex(value);
						const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
						if (chatbotContainer) {
							chatbotContainer.style.backgroundColor = colorToHex(value);
						}
						await this.plugin.saveSettings();
					});
		
				// Start polling when color picker is added
				let previousDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim());
				pollingInterval = setInterval(() => {
					const currentDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim());
					if (currentDefaultColor !== previousDefaultColor) {
						// If the default color has changed (i.e., the theme has changed), reset the color picker
						colorPicker.setValue(currentDefaultColor);
						previousDefaultColor = currentDefaultColor;
					}
				}, 1000); // Poll every second
			});

			let colorPicker1: ColorComponent;
			let pollingInterval1: string | number | NodeJS.Timer | undefined;
			
			new Setting(containerEl)
				.setName('Background color for User Message')
				.setDesc('Modify the background color of the userMessage element.')
				.addButton(button => button
					.setButtonText("Restore Default")
					.setIcon("rotate-cw")
					.setClass("clickable-icon")
					.onClick(async () => {
						const defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
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
					const defaultValue = colorToHex(this.plugin.settings.userMessageBackgroundColor) || colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
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
			
								const observer = new MutationObserver((mutations) => {
									mutations.forEach((mutation) => {
										if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
											mutation.addedNodes.forEach((node) => {
												if ((node as HTMLElement).classList.contains('userMessage')) {
													(node as HTMLElement).style.backgroundColor = hexValue;
												}
											});
										}
									});
								});
			
								observer.observe(messageContainer, { childList: true });
							}
							await this.plugin.saveSettings();
						});
			
					let previousDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
					pollingInterval1 = setInterval(() => {
						const currentDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
						if (currentDefaultColor !== previousDefaultColor) {
							// If the default color has changed (i.e., the theme has changed), reset the color picker
							colorPicker1.setValue(currentDefaultColor);
							previousDefaultColor = currentDefaultColor;
						}
					}, 1000); // Poll every second
				});			

			let colorPicker2: ColorComponent;
			let pollingInterval2: string | number | NodeJS.Timer | undefined;
			
			new Setting(containerEl)
				.setName('Background color for Bot Message')
				.setDesc('Modify the background color of the botMessage element.')
				.addButton(button => button
					.setButtonText("Restore Default")
					.setIcon("rotate-cw")
					.setClass("clickable-icon")
					.onClick(async () => {
						const defaultValue = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
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
					const defaultValue = colorToHex(this.plugin.settings.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
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
			
								const observer = new MutationObserver((mutations) => {
									mutations.forEach((mutation) => {
										if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
											mutation.addedNodes.forEach((node) => {
												if ((node as HTMLElement).classList.contains('botMessage')) {
													(node as HTMLElement).style.backgroundColor = hexValue;
												}
											});
										}
									});
								});
			
								observer.observe(messageContainer, { childList: true });
							}
							await this.plugin.saveSettings();
						});
			
					let previousDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
					pollingInterval2 = setInterval(() => {
						const currentDefaultColor = colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
						if (currentDefaultColor !== previousDefaultColor) {
							// If the default color has changed (i.e., the theme has changed), reset the color picker
							colorPicker2.setValue(currentDefaultColor);
							previousDefaultColor = currentDefaultColor;
						}
					}, 1000); // Poll every second
				});
				

		// Be sure to clear the interval when the settings pane is closed to avoid memory leaks
		onunload = () => {
			clearInterval(pollingInterval);
			clearInterval(pollingInterval1);
			clearInterval(pollingInterval2);
		}

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
