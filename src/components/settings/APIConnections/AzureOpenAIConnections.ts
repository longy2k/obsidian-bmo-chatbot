import {setIcon, Setting, SettingTab} from 'obsidian';
import {fetchAzureOpenAIBaseModels} from 'src/components/FetchModelList';
import BMOGPT from 'src/main';

export function addAzureOpenAIConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
	const toggleSettingContainer = containerEl.createDiv({cls: 'toggleSettingContainer'});
	toggleSettingContainer.createEl('h2', {text: 'Azure OpenAI'});

	const initialState = plugin.settings.toggleAzureOpenAISettings;
	const chevronIcon = toggleSettingContainer.createEl('span', {cls: 'chevron-icon'});
	setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

	// Create the settings container to be toggled
	const settingsContainer = containerEl.createDiv({cls: 'settingsContainer'});
	settingsContainer.style.display = initialState ? 'block' : 'none';

	// Toggle visibility
	toggleSettingContainer.addEventListener('click', async () => {
		const isOpen = settingsContainer.style.display !== 'none';
		if (isOpen) {
			setIcon(chevronIcon, 'chevron-right'); // Close state
			settingsContainer.style.display = 'none';
			plugin.settings.toggleAzureOpenAISettings = false;

		} else {
			setIcon(chevronIcon, 'chevron-down'); // Open state
			settingsContainer.style.display = 'block';
			plugin.settings.toggleAzureOpenAISettings = true;
		}
		await plugin.saveSettings();
	});

	let defaultValue = plugin.settings.APIConnections.azureOpenAI?.APIKey || ""
	if (defaultValue.length > 5) {
		defaultValue = `${defaultValue.substring(0, 2)}...${defaultValue.substring(defaultValue.length - 2, defaultValue.length)}`
	}
	new Setting(settingsContainer)
		.setName('Azure OpenAI API Key')
		.setDesc('Insert Azure OpenAI API Key.')
		.addText(text => text
			.setPlaceholder('API Key')
			.setValue(defaultValue)
			.onChange(async (value) => {
				plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels = [];
				plugin.settings.APIConnections.azureOpenAI.APIKey = value;
				if (plugin.settings.APIConnections.azureOpenAI.APIKey === '') {
					plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels = [];
				} else {
					const models = await fetchAzureOpenAIBaseModels(plugin);
					models.forEach((model) => {
						if (!plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels.includes(model)) {
							plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels.push(model);
						}
					});
				}
			})
			.inputEl.addEventListener('focusout', async () => {
				await plugin.saveSettings();
				SettingTab.display();
			})
		);

	new Setting(settingsContainer)
		.setName('Azure Endpoint (URL)')
		.setDesc("Enter your account's Azure Endpoint URL.")
		.addButton(button => button
			.setButtonText('Restore Default')
			.setIcon('rotate-cw')
			.setClass('clickable-icon')
			.onClick(async () => {
				plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels = [];
				await plugin.saveSettings();
				SettingTab.display();
			})
		).addText(text => text
		.setValue(plugin.settings.APIConnections.azureOpenAI?.azureOpenAIBaseUrl || "")
		.onChange(async (value) => {
			plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseUrl = value
			await plugin.saveSettings();
		})
		.inputEl.addEventListener('focusout', async () => {
			SettingTab.display();
		})
	);

	new Setting(settingsContainer)
		.setName('Azure Deployment Name')
		.setDesc("Enter the model's deployment name.")
		.addButton(button => button
			.setButtonText('Restore Default')
			.setIcon('rotate-cw')
			.setClass('clickable-icon')
			.onClick(async () => {
				plugin.settings.APIConnections.azureOpenAI.azureOpenAIBaseModels = [];
				plugin.settings.APIConnections.azureOpenAI.deploymentName = '';
				await plugin.saveSettings();
				SettingTab.display();
			})
		).addText(text => text
		.setValue(plugin.settings.APIConnections.azureOpenAI?.deploymentName || "")
		.onChange(async (value) => {
			plugin.settings.APIConnections.azureOpenAI.deploymentName = value
			await plugin.saveSettings();
		})
		.inputEl.addEventListener('focusout', async () => {
			SettingTab.display();
		})
	);
}
