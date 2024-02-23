import { App, PluginSettingTab } from 'obsidian';
import BMOGPT from './main';
import { addGeneralSettings } from './components/settings/GeneralSettings';
import { addAppearanceSettings } from './components/settings/AppearanceSettings';
import { addChatHistorySettings } from './components/settings/ChatHistorySettings';
import { addOllamaSettings } from './components/settings/OllamaSettings';
import { addAPIConnectionSettings } from './components/settings/ConnectionSettings';
import { addPromptSettings } from './components/settings/PromptSettings';
import { addRESTAPIURLSettings } from './components/settings/OpenAIRestAPISettings';
import { addEditorSettings } from './components/settings/EditorSettings';

export class BMOSettingTab extends PluginSettingTab {
	plugin: BMOGPT;

	constructor(app: App, plugin: BMOGPT) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'BMO Chatbot Settings'});

		const changeLogLink = containerEl.createEl('a', {
			text: 'Changelog',
			href: 'https://github.com/longy2k/obsidian-bmo-chatbot/releases',
		});

		changeLogLink.style.fontSize = '0.8rem'; 

		containerEl.createEl('p', {text: 'Type `/help` in chat for commands.'});

		// Display settings
		addGeneralSettings(this.containerEl, this.plugin, this);
		addAppearanceSettings(this.containerEl, this.plugin, this);
		addEditorSettings(this.containerEl, this.plugin, this);		
		addChatHistorySettings(this.containerEl, this.plugin, this);
		addPromptSettings(this.containerEl, this.plugin, this);

		const separator = document.createElement('hr');
		separator.style.margin = '1rem 0';
		this.containerEl.appendChild(separator);

		addOllamaSettings(this.containerEl, this.plugin, this);
		addRESTAPIURLSettings(this.containerEl, this.plugin, this);
		addAPIConnectionSettings(this.containerEl, this.plugin, this);
	}
}
