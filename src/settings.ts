import { App, PluginSettingTab } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from './main';
import { addGeneralSettings } from './components/settings/GeneralSettings';
import { addAppearanceSettings } from './components/settings/AppearanceSettings';
import { addChatHistorySettings } from './components/settings/ChatHistorySettings';
import { addOllamaSettings } from './components/settings/OllamaSettings';
import { addAPIConnectionSettings } from './components/settings/ConnectionSettings';
import { addProfileSettings } from './components/settings/ProfileSettings';
import { addRESTAPIURLSettings } from './components/settings/RESTAPIURLSettings';
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
		addProfileSettings(this.containerEl, this.plugin, this);
		addGeneralSettings(this.containerEl, this.plugin, this);
		addAppearanceSettings(this.containerEl, this.plugin, this);
		addEditorSettings(this.containerEl, this.plugin, this);		
		addChatHistorySettings(this.containerEl, this.plugin, this);

		addHorizontalRule(this.containerEl);

		addOllamaSettings(this.containerEl, this.plugin, this);
		addRESTAPIURLSettings(this.containerEl, this.plugin, this);
		addAPIConnectionSettings(this.containerEl, this.plugin, this);

		addHorizontalRule(this.containerEl);

		const resetButton = containerEl.createEl('a', {
			text: 'Reset Settings',
			href: '#',
			attr: {
				style: 'display: block; text-align: center; margin: 1rem 0; font-size: 0.7rem; color: #ff6666;'
			}
		});

		resetButton.addEventListener('click', async (event) => {
			event.preventDefault();
			const confirmReset = confirm('Are you sure you want to reset all settings to default?');
			if (confirmReset) {
				this.plugin.settings = DEFAULT_SETTINGS;
				await this.plugin.saveSettings();
				// @ts-ignore
				await this.plugin.app.plugins.disablePlugin(this.plugin.manifest.id);
				// @ts-ignore
				await this.plugin.app.plugins.enablePlugin(this.plugin.manifest.id);
				// @ts-ignore
				this.plugin.app.setting.openTabById(this.plugin.manifest.id).display();
			}
		});

		const resetNotice = containerEl.createEl('p', {
			text: 'Please reset your settings if you have recently updated from version <1.9.0.',
			attr: {
				style: 'font-size: 0.7rem; text-align: center;'
			}
		});
		containerEl.appendChild(resetNotice);
	}
}

function addHorizontalRule(containerEl: HTMLElement) {
	const separator = document.createElement('hr');
	separator.style.margin = '1rem 0';
	containerEl.appendChild(separator);
}