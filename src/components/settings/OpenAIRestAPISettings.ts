import { Setting, SettingTab, setIcon } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

export function addOpenAIRestAPIUrlSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'OPENAI REST API URL Connection'});

    const initialState = plugin.settings.toggleOpenAIRestAPIUrlSettings;
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
            plugin.settings.toggleOpenAIRestAPIUrlSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleOpenAIRestAPIUrlSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('OPENAI REST API URL')
    .setDesc('Enter your custom OPENAI REST API url.')
    .addText(text => text
        .setPlaceholder('http://localhost:1234')
        .setValue(plugin.settings.openAIRestAPIUrl || DEFAULT_SETTINGS.openAIRestAPIUrl)
        .onChange(async (value) => {
                plugin.settings.openAIRestAPIUrl = value ? value : DEFAULT_SETTINGS.openAIRestAPIUrl;
                await plugin.saveSettings();
            })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );

    new Setting(settingsContainer)
    .setName('Allow Stream')
    .setDesc(addDescriptionLink('Allow custom OPENAI REST API models to stream response. Additional setup required: ', 'https://github.com/longy2k/obsidian-bmo-chatbot/wiki/How-to-setup-with-LM-Studio', '', '[Instructions]'))
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.allowOpenAIRestAPIStream).onChange((value) => {
            plugin.settings.allowOpenAIRestAPIStream = value;
            plugin.saveSettings();
        })
    );
}