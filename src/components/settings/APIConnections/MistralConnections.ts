import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchMistralModels } from 'src/components/FetchModelList';
import BMOGPT from 'src/main';

export function addMistralConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'Mistral AI' });

    const initialState = plugin.settings.toggleMistralSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.style.display = initialState ? 'block' : 'none';

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = settingsContainer.style.display !== 'none';
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.style.display = 'none';
            plugin.settings.toggleMistralSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleMistralSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('Mistral API Key')
    .setDesc('Insert Mistral API Key.')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.APIConnections.mistral.APIKey ? `${plugin.settings.APIConnections.mistral.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.mistral.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.mistral.mistralModels = [];
            plugin.settings.APIConnections.mistral.APIKey = value;
            if (plugin.settings.APIConnections.mistral.APIKey === '') {
                plugin.settings.APIConnections.mistral.mistralModels = [];
            }
            else {
                const models = await fetchMistralModels(plugin);
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.mistral.mistralModels.includes(model)) {
                        plugin.settings.APIConnections.mistral.mistralModels.push(model);
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
    .setName('Enable Stream')
    .setDesc('Enable stream for Mistral models.')
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.APIConnections.mistral.enableStream).onChange((value) => {
            plugin.settings.APIConnections.mistral.enableStream = value;
            plugin.saveSettings();
        })
    );
}