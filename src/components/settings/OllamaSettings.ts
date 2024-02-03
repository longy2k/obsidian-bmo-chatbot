import { Setting, SettingTab, setIcon } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

// Ollama Settings
export function addOllamaSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Ollama Local LLMs'});

    const initialState = plugin.settings.toggleOllamaSettings;
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
            plugin.settings.toggleOllamaSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleOllamaSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
        .setName('OLLAMA REST API URL')
        .setDesc(addDescriptionLink('Enter your REST API URL using', 'https://ollama.ai/', '', 'Ollama'))
        .addText(text => text
            .setPlaceholder('http://localhost:11434')
            .setValue(plugin.settings.ollamaRestAPIUrl || DEFAULT_SETTINGS.ollamaRestAPIUrl)
            .onChange(async (value) => {
                    plugin.settings.ollamaRestAPIUrl = value ? value : DEFAULT_SETTINGS.ollamaRestAPIUrl;
                    await plugin.saveSettings();
                })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(settingsContainer)
        .setName('Allow Stream')
        .setDesc(addDescriptionLink('Allow Ollama models to stream response. Additional setup required: ', 'https://github.com/longy2k/obsidian-bmo-chatbot/wiki/How-to-setup-with-Ollama', '', '[Instructions]'))
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.allowOllamaStream).onChange((value) => {
                plugin.settings.allowOllamaStream = value;
                plugin.saveSettings();
            })
        );

}