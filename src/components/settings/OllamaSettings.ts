import { Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

// Ollama Settings
export function addOllamaSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Ollama Local LLMs'});
    new Setting(containerEl)
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

    new Setting(containerEl)
        .setName('Allow Stream')
        .setDesc(addDescriptionLink('Allow Ollama models to stream response. Additional setup required: ', 'https://github.com/longy2k/obsidian-bmo-chatbot/wiki', '', '[Instructions]'))
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.allowOllamaStream).onChange((value) => {
                plugin.settings.allowOllamaStream = value;
                plugin.saveSettings();
            })
        );

}