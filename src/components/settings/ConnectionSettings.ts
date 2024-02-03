import { Setting, SettingTab, setIcon } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";

export function addAPIConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'API Connection' });

    const initialState = plugin.settings.toggleAPIConnectionSettings;
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
            plugin.settings.toggleAPIConnectionSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleAPIConnectionSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
        .setName('API Key')
        .setDesc('Insert API Key.')
        .addText(text => text
            .setPlaceholder('insert-api-key')
            .setValue(plugin.settings.apiKey ? `${plugin.settings.apiKey.slice(0, 6)}-...${plugin.settings.apiKey.slice(-4)}` : "")
            .onChange(async (value) => {
                plugin.settings.apiKey = value;
                await plugin.saveSettings();
            })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(settingsContainer)
        .setName('OPENAI BASE URL')
        .setDesc('Enter your custom OpenAI-base url.')
        .addButton(button => button
            .setButtonText("Restore Default")
            .setIcon("rotate-cw")
            .setClass("clickable-icon")
            .onClick(async () => {
                plugin.settings.openAIBaseUrl = DEFAULT_SETTINGS.openAIBaseUrl;
                await plugin.saveSettings();
                SettingTab.display();
            })
        )
        .addText(text => text
            .setPlaceholder('https://api.openai.com/v1')
            .setValue(plugin.settings.openAIBaseUrl || DEFAULT_SETTINGS.openAIBaseUrl)
            .onChange(async (value) => {
                    plugin.settings.openAIBaseUrl = value ? value : DEFAULT_SETTINGS.openAIBaseUrl;
                    await plugin.saveSettings();
                })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );
}

