import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Configuration, OpenAIApi } from "openai";

// Remember to rename these classes and interfaces!

interface BMOSettings {
	apiKey: string;
	temperature: number;
	top_p: number;
	n: number;
	max_tokens: number;

}

const DEFAULT_SETTINGS: BMOSettings = {
	apiKey: ''
}

export default class BMOGPT extends Plugin {
	settings: BMOSettings;
	openai: OpenAIApi;

	async onload() {
		await this.loadSettings();

		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});
		this.openai = new OpenAIApi(configuration);

		this.addCommand({
			id: "execute-note-prompt",
			name: "Execute prompt (within current note)",
			callback: this.handleChatbotCompletion.bind(this),
		});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('bot', 'BMO GPT-3.5-Turbo', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice! dasdasdas');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Tokens Used: 0');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BMOSettingTab(this.app, this));

	}

	async onunload() {
		await this.loadSettings();

		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});
		this.openai = new OpenAIApi(configuration);
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
    	const filename = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf('.'));

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
										{ role: 'system', content: "You will play the role of an AI-powered note optimization system. Imagine that you have been programmed to automatically analyze and optimize notes for maximum clarity and effectiveness. Your task is to thoroughly review the notes provided to you and make any necessary changes to improve their organization, structure, and coherence. Your role is not to provide guidance or suggestions, but to use your advanced analytical capabilities to enhance the notes to the best of your ability. As an AI system, you are not limited by personal biases or preferences and can optimize the notes objectively for the user's benefit. There is no need to explain the differences between the user's input and the assistant's output."},
										{ role: 'user', content: `${filename}\n\n${editor.getValue()}` }
									],
	            }),
	        });

	        const data = await response.json();
					console.log(data); // Log the response data to the console
					console.log(`${filename}\n\n${editor.getValue()}`);
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
	}
}
