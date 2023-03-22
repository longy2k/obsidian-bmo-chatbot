import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView } from 'obsidian';
import { Configuration, OpenAIApi } from "openai";
import { BMOView, VIEW_TYPE_EXAMPLE } from "./view";

// Remember to rename these classes and interfaces!
interface BMOSettings {
	apiKey: string;
	max_tokens: number;
	system_role: string;
	temperature: number;
}

const DEFAULT_SETTINGS: BMOSettings = {
	apiKey: '',
	max_tokens: 4096,
	system_role: 'You are a helpful assistant.',
	temperature: 1,
}

export default class BMOGPT extends Plugin {
	settings: BMOSettings;
	openai: OpenAIApi;

	async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new BMOView(leaf)
		  );

		  this.addRibbonIcon("BMO", "BMO", async () => {
			const leaf = this.app.workspace.getLeaf();
			if (leaf) {
			  new BMOView(leaf);
			}
		  });

		this.addRibbonIcon("dice", "Activate view", () => {
		    this.activateView();
		});

		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});
		this.openai = new OpenAIApi(configuration);

		this.addCommand({
			id: "execute-note-prompt",
			name: "Execute prompt (within current note)",
			callback: this.handleChatbotCompletion.bind(this),
		});

		// window.addEventListener("inputReceived", (event) => {
		//   console.log("inputReceived event received", event.detail.value);
		//   this.BMOchatbot(event.detail.value);
		// });

		window.addEventListener("inputReceived", (event) => {
		//   console.log("inputReceived event received", event.detail.value);
		  this.BMOchatbot(event.detail.value);
		});



		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('bot', 'BMO GPT-3.5-Turbo', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
		// 	new Notice('This is a notice! dasdasdas');
		// });
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Tokens Used: 0');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BMOSettingTab(this.app, this));

	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});
		this.openai = new OpenAIApi(configuration);
		console.log("Unloading plugin...");
		window.removeEventListener("inputReceived", (event) => {
			this.BMOchatbot(event.detail.value);
		});
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
	
		await this.app.workspace.getRightLeaf(false).setViewState({
		  type: VIEW_TYPE_EXAMPLE,
		  active: true,
		});
	
		this.app.workspace.revealLeaf(
		  this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
		);
	}
	
	async BMOchatbot(input: string) {
		if (!this.settings.apiKey) {
			new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
			return;
		}
	
		// console.log("BMO settings:", this.settings);
		// console.log("system_role:", this.settings.system_role);
	
		try {
			const maxTokens = parseInt(this.settings.max_tokens);
			const temperature = parseInt(this.settings.temperature);
	
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.settings.apiKey}`
				},
				body: JSON.stringify({
					model: 'gpt-3.5-turbo',
					messages: [
						{ role: 'system', content: this.settings.system_role },
						{ role: 'user', content: input }
					],
					max_tokens: maxTokens,
					temperature: temperature,
				}),
			});
	
			const data = await response.json();
			// console.log(data);
	
			const message = data.choices[0].message.content;
	
			// Append the bmoMessage element to the messageContainer div
			// bmoMessageEl.classList.add("bmoStyle");
			const messageContainerEl = document.getElementById("messageContainer");
			if (messageContainerEl) {
				const bmoMessageEl = document.createElement("p");
				bmoMessageEl.style.display = "inline-block";
				bmoMessageEl.textContent = message;
				messageContainerEl.appendChild(bmoMessageEl);
			}
		
			} catch (error) {
				new Notice('Error occurred while fetching completion: ' + error.message);
			}
	}
	

	async handleChatbotCompletion() {
	    if (!this.settings.apiKey) {
	        new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
	        return;
	    }

	    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
	    if (!view) {
	        new Notice("No active Markdown view found.");
	        return;
	    }
	    const editor = view.editor;
		const filenameWithExtension = view.file.path.split('/').pop();
    	let filename;
		if (filenameWithExtension) {
			filename = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));
		}
		// console.log("view.file:", view.file);
		// console.log("view.file.path:", view.file.path);

	    try {
	        const response = await fetch('https://api.openai.com/v1/chat/completions', {
	            method: 'POST',
	            headers: {
	                'Content-Type': 'application/json',
	                'Authorization': `Bearer ${this.settings.apiKey}`
	            },
	            body: JSON.stringify({
	                model: 'gpt-3.5-turbo',
	                messages: [
										{ role: 'system', content: this.settings.system_role},
										{ role: 'user', content: `${filename}\n\n${editor.getValue()}` }
									],
									max_tokens: parseInt(this.settings.max_tokens),
									temperature: parseInt(this.settings.temperature),
	            }),
	        });

	        const data = await response.json();
			// console.log(data);
			// console.log("Input: " + `\n${filename}\n\n${editor.getValue()}`);
			// console.log("System role: " + this.settings.system_role);
	        const message = data.choices[0].message.content;
	        editor.replaceSelection(message);
	    } catch (error) {
	        new Notice('Error occurred while fetching completion: ' + error.message);
	    }
	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class BMOSettingTab extends PluginSettingTab {
	plugin: BMOGPT;

	constructor(app: App, plugin: BMOGPT) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for BMO-Obsdian-GPT'});

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
			.setDesc('Insert API Key from OpenAI')
			.addText(text => text
				.setPlaceholder('OpenAI-api-key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model')
			.setDesc('Snapshot of gpt-3.5-turbo from March 1st 2023. Unlike gpt-3.5-turbo, this model will not receive updates, and will only be supported for a three month period ending on June 1st 2023. (Training Data: Up to Sep 2021)')
			.addText(text => text
				.setValue('gpt-3.5-turbo-0301')
				.setDisabled(true)
		);

		new Setting(containerEl)
			.setName('System')
			.setDesc('System role prompt')
			.addTextArea(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.system_role)
				.onChange(async (value) => {
					this.plugin.settings.system_role = value;
					await this.plugin.saveSettings();
				})
		);

		new Setting(containerEl)
			.setName('Max Tokens')
			.setDesc(descLink('When you chat with an AI, this setting controls the maximum length of the response it can generate. The response is broken down into small units called "tokens," and the maximum number of these tokens is limited to a specific number. (Max Token: 4096)', 'https://platform.openai.com/tokenizer'))
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
			.setDesc('Temperature is a setting in AI language models that controls how predictable or random the generated text is. Lower values (closer to 0) produce more predictable text, while higher values (closer to 2) result in more creative and unpredictable outputs.')
			.addText(text => text
				.setPlaceholder('1')
				.setValue(this.plugin.settings.temperature)
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
	}
}

