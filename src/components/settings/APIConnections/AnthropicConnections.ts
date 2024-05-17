import { Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT from 'src/main';
import { ANTHROPIC_MODELS } from 'src/view';

export function addAnthropicConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'Anthropic' });

    const initialState = plugin.settings.toggleAnthropicSettings;
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
            plugin.settings.toggleAnthropicSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleAnthropicSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('Anthropic API Key')
    .setDesc('Insert Anthropic API Key.')
    .addText(text => text
        .setPlaceholder('insert-api-key')
        .setValue(plugin.settings.APIConnections.anthropic.APIKey ? `${plugin.settings.APIConnections.anthropic.APIKey.slice(0, 6)}-...${plugin.settings.APIConnections.anthropic.APIKey.slice(-4)}` : '')
        .onChange(async (value) => {
            plugin.settings.APIConnections.anthropic.anthropicModels = [];
            plugin.settings.APIConnections.anthropic.APIKey = value;
            if (plugin.settings.APIConnections.anthropic.APIKey === '') {
                plugin.settings.APIConnections.anthropic.anthropicModels = [];
            } else {
                const models = ANTHROPIC_MODELS;
                models.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.anthropic.anthropicModels.includes(model)) {
                        plugin.settings.APIConnections.anthropic.anthropicModels.push(model);
                    }
                });
            }
        })
        .inputEl.addEventListener('focusout', async () => {
            await plugin.saveSettings();
            SettingTab.display();
        })
    );
}
