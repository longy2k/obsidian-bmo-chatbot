import { App, PluginSettingTab } from 'obsidian';
import BMOGPT from './main';
import { addGeneralSettings } from './components/settings/GeneralSettings';
import { addAppearanceSettings } from './components/settings/AppearanceSettings';
import { addChatHistorySettings } from './components/settings/ChatHistorySettings';
import { addOllamaSettings } from './components/settings/OllamaSettings';
import { addConnectionSettings } from './components/settings/ConnectionSettings';
import { addPromptSettings } from './components/settings/PromptSettings';
// import { fetchOllamaModels, fetchOpenAIRestAPIModels } from './components/FetchModelList';

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

		const changeLogLink = containerEl.createEl("a", {
			text: "Changelog",
			href: "https://github.com/longy2k/obsidian-bmo-chatbot/releases",
		});

		changeLogLink.style.fontSize = "0.8rem"; 

		containerEl.createEl('p', {text: 'Type `/help` in chat for commands.'});

		// Display settings
		addConnectionSettings(this.containerEl, this.plugin, this);
		addOllamaSettings(this.containerEl, this.plugin, this);
		addGeneralSettings(this.containerEl, this.plugin, this);
		addAppearanceSettings(this.containerEl, this.plugin, this);		
		addChatHistorySettings(this.containerEl, this.plugin, this);
		addPromptSettings(this.containerEl, this.plugin, this);
	}
}
