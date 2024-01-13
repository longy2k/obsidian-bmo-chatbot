import { DropdownComponent, Notice, Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "src/view";
import { fetchOpenAIBaseModels } from "../FetchModelList";

export function addGeneralSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab, openAIRestAPIModels: string[], ollamaModels: string[]) {
    containerEl.createEl('h2', {text: 'General'});
    
    // new Setting(containerEl)
    // .setName('API Key')
    // .setDesc('Insert API Key from OpenAI or Anthropic.')
    // .addText(text => text
    //     .setPlaceholder('insert-api-key')
    //     .setValue(plugin.settings.apiKey ? `${plugin.settings.apiKey.slice(0, 6)}-...${plugin.settings.apiKey.slice(-4)}` : "")
    //     .onChange(async (value) => {
    //         plugin.settings.apiKey = value;
    //         await plugin.saveSettings();
    //     })
    //     .inputEl.addEventListener('focusout', async () => {
    //         SettingTab.display();
    //     })
    // );

    // Function to add options to dropdown
    const addOptionsToDropdown = (dropdown: DropdownComponent, models: string[]) => {
        models.forEach(model => {
        dropdown.addOption(model, model);
        });
    };

    new Setting(containerEl)
        .setName('Model')
        .setDesc('Choose a model.')
        .addDropdown(async dropdown => {
            plugin.settings.allModels = [];
            if (plugin.settings.apiKey && !plugin.settings.apiKey.startsWith("sk-ant") && (plugin.settings.openAIBaseUrl === DEFAULT_SETTINGS.openAIBaseUrl)) {
                addOptionsToDropdown(dropdown, OPENAI_MODELS);
                for (const model of OPENAI_MODELS) {
                    if (!plugin.settings.allModels.includes(model)) {
                        plugin.settings.allModels.push(model);
                    }
                }
            }
            if (plugin.settings.apiKey && plugin.settings.apiKey.startsWith("sk-ant")) {
                addOptionsToDropdown(dropdown, ANTHROPIC_MODELS);
                for (const model of ANTHROPIC_MODELS) {
                    if (!plugin.settings.allModels.includes(model)) {
                        plugin.settings.allModels.push(model);
                    }
                }
            }
            if (plugin.settings.ollamaRestAPIUrl && plugin.settings.ollamaModels && plugin.settings.ollamaModels.length > 0) {
                try {
                    ollamaModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    console.error('Error:', error);
                    new Notice('Ollama connection error.');
                }
            }
            if (plugin.settings.openAIRestAPIUrl && openAIRestAPIModels && openAIRestAPIModels.length > 0) {
                try {
                    openAIRestAPIModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    console.error('Error:', error);
                    new Notice('LocalAI connection error.');
                }
            }
            if (plugin.settings.apiKey && (plugin.settings.openAIBaseUrl != DEFAULT_SETTINGS.openAIBaseUrl)) {
                const openAIModels = await fetchOpenAIBaseModels(plugin);
                try {
                    openAIModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    console.error('Error:', error);
                    new Notice('OpenAI-based url connection error.');
                }
            }
            dropdown
                .setValue(plugin.settings.model || DEFAULT_SETTINGS.model)
                .onChange(async (value) => {
                    plugin.settings.model = value;
                    await plugin.saveSettings();
                    const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                    if (modelName) {
                        modelName.textContent = 'Model: ' + plugin.settings.model.toLowerCase();
                    }
                })
        });

    new Setting(containerEl)
        .setName('System')
        .setDesc('System role prompt.')
        .addTextArea(text => text
            .setPlaceholder('You are a helpful assistant.')
            .setValue(plugin.settings.system_role !== undefined ? plugin.settings.system_role : "You are a helpful assistant who responds in markdown.")
            .onChange(async (value) => {
                plugin.settings.system_role = value !== undefined ? value : DEFAULT_SETTINGS.system_role;
                await plugin.saveSettings();
            })
        );

    new Setting(containerEl)
        .setName('Max Tokens')
        .setDesc(descLink('The maximum number of tokens, or words, that the model is allowed to generate in its output.', 'https://platform.openai.com/tokenizer'))
        .addText(text => text
            .setPlaceholder('4096')
            .setValue(plugin.settings.max_tokens)
            .onChange(async (value) => {
                plugin.settings.max_tokens = value;
                await plugin.saveSettings();
            })
        );

    new Setting(containerEl)
        .setName('Temperature')
        .setDesc('Temperature controls how random the generated output is. Lower values make the text more predictable, while higher values make it more creative and unpredictable.')
        .addSlider(slider => slider
            .setLimits(0, 1, 0.05)
            .setValue(plugin.settings.temperature !== undefined ? plugin.settings.temperature : DEFAULT_SETTINGS.temperature)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.temperature = value;
                await plugin.saveSettings();
            })
        );

    new Setting(containerEl)
        .setName('Allow Reference Current Note')
        .setDesc('Allow chatbot to reference current active note during conversation.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.referenceCurrentNote).onChange((value) => {
                plugin.settings.referenceCurrentNote = value;
                plugin.saveSettings();

                const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
                if (referenceCurrentNoteElement) {
                    if (value) {
                        referenceCurrentNoteElement.style.display = 'block';
                    } else {
                        referenceCurrentNoteElement.style.display = 'none';
                    }
                }
            })
        );

    function descLink(text: string, link: string): DocumentFragment {
        const frag = new DocumentFragment();
        const desc = document.createElement('span');
        desc.innerText = text + ' ';
        frag.appendChild(desc);

        const anchor = document.createElement('a');
        anchor.href = link;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.innerText = '(https://platform.openai.com/tokenizer)';
        frag.appendChild(anchor);

        return frag;
    }
}