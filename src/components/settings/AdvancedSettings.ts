import { Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

export function addAdvancedSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Advanced'});

    new Setting(containerEl)
    .setName('OPENAI BASE URL')
    .setDesc('Enter your custom OpenAI base url.')
    .addButton(button => button
        .setButtonText("Restore Default")
        .setIcon("rotate-cw")
        .setClass("clickable-icon")
        .onClick(async () => {
            plugin.settings.openAIBaseUrl = DEFAULT_SETTINGS.openAIBaseUrl;
            SettingTab.display();
            await plugin.saveSettings();
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

    new Setting(containerEl)
    .setName('LOCALAI REST API URL')
    .setDesc(addDescriptionLink('Enter your REST API URL using', 'https://github.com/go-skynet/LocalAI', '', 'LocalAI'))
    .addText(text => text
        .setPlaceholder('http://localhost:8080')
        .setValue(plugin.settings.localAIRestAPIUrl || DEFAULT_SETTINGS.localAIRestAPIUrl)
        .onChange(async (value) => {
                plugin.settings.localAIRestAPIUrl = value ? value : DEFAULT_SETTINGS.localAIRestAPIUrl;
                await plugin.saveSettings();
            })
        .inputEl.addEventListener('focusout', async () => {
            SettingTab.display();
        })
    );
}