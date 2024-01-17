import { Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

export function addOpenAIRestAPIUrlSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'OPENAI REST API URL Connection'});

    new Setting(containerEl)
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

    new Setting(containerEl)
    .setName('Allow Stream')
    .setDesc(addDescriptionLink('Allow custom OPENAI REST API models to stream response. Additional setup required: ', 'https://github.com/longy2k/obsidian-bmo-chatbot/wiki/How-to-setup-with-LM-Studio', '', '[Instructions]'))
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.allowOpenAIRestAPIStream).onChange((value) => {
            plugin.settings.allowOpenAIRestAPIStream = value;
            plugin.saveSettings();
        })
    );
}