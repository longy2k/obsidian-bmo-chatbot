import { Setting, SettingTab, setIcon } from 'obsidian';
import { fetchOpenRouterModels } from 'src/components/FetchModelList';
import BMOGPT from 'src/main';

export function addOpenRouterConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'OpenRouter' });

    const initialState = plugin.settings.toggleOpenRouterSettings;
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
            plugin.settings.toggleOpenRouterSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleOpenRouterSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('OpenRouter API Key')
    .setDesc('Insert OpenRouter API Key.')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.APIConnections.openRouter.APIKey ? `${plugin.settings.APIConnections.openRouter.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.openRouter.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.openAI.openAIBaseModels = [];
            plugin.settings.APIConnections.openRouter.APIKey = value;
            if (plugin.settings.APIConnections.openRouter.APIKey === '') {
                plugin.settings.APIConnections.openRouter.openRouterModels = [];
            }
            else {
                const models = await fetchOpenRouterModels(plugin);
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.openRouter.openRouterModels.includes(model)) {
                        plugin.settings.APIConnections.openRouter.openRouterModels.push(model);
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
    .setDesc('Enable stream for OpenRouter models.')
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.APIConnections.openRouter.enableStream).onChange((value) => {
            plugin.settings.APIConnections.openRouter.enableStream = value;
            plugin.saveSettings();
        })
    );
}