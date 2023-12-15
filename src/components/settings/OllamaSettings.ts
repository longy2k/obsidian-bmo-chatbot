import { Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { addDescriptionLink } from "src/utils/DescriptionLink";

export function addOllamaSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Ollama'});
    new Setting(containerEl)
        .setName('OLLAMA REST API URL')
        .setDesc(addDescriptionLink('Enter your OLLAMA REST API URL. ', 'https://github.com/longy2k/obsidian-bmo-chatbot/wiki', '', '[Instructions]'))
        .addText(text => text
            .setPlaceholder('http://localhost:11435')
            .setValue(plugin.settings.ollamaRestAPIUrl || DEFAULT_SETTINGS.ollamaRestAPIUrl)
            .onChange(async (value) => {
                    plugin.settings.ollamaRestAPIUrl = value ? value : DEFAULT_SETTINGS.ollamaRestAPIUrl;
                    await plugin.saveSettings();
                })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    // function descLink1(text: string, link: string, extraWords: string, innerText: string): DocumentFragment {
    //     const frag = new DocumentFragment();
    //     const desc = document.createElement('span');
    //     desc.innerText = text + ' ';
    //     frag.appendChild(desc);
    
    //     const anchor = document.createElement('a');
    //     anchor.href = link;
    //     anchor.target = '_blank';
    //     anchor.rel = 'noopener noreferrer';
    //     anchor.innerText = innerText;
    //     frag.appendChild(anchor);
    
    //     const extra = document.createElement('span');
    //     extra.innerText = ' ' + extraWords;
    //     frag.appendChild(extra);
    
    //     return frag;
    // }
}