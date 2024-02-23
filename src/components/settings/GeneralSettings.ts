import { DropdownComponent, Notice, Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from 'src/view';
import { fetchGoogleGeminiModels, fetchMistralModels, fetchOllamaModels, fetchOpenAIBaseModels, fetchRESTAPIURLModels } from '../FetchModelList';

export async function addGeneralSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'General'});

    const initialState = plugin.settings.toggleGeneralSettings;
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
            plugin.settings.toggleGeneralSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleGeneralSettings = true;
        }
        await plugin.saveSettings();
    });

    // Function to add options to dropdown
    const addOptionsToDropdown = (dropdown: DropdownComponent, models: string[]) => {
        models.forEach(model => {
        dropdown.addOption(model, model);
        });
    };

    new Setting(settingsContainer)
        .setName('Model')
        .setDesc('Choose a model.')
        .addDropdown(async dropdown => {
            plugin.settings.allModels = [];
            if (plugin.settings.APIConnections.openAI.APIKey && (plugin.settings.APIConnections.openAI.openAIBaseUrl === DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl)) {
                addOptionsToDropdown(dropdown, OPENAI_MODELS);
                for (const model of OPENAI_MODELS) {
                    if (!plugin.settings.allModels.includes(model)) {
                        plugin.settings.allModels.push(model);
                    }
                }
            }
            if (plugin.settings.OllamaConnection.RESTAPIURL !== '') {
                const ollamaModels = await fetchOllamaModels(plugin);
                try {
                    ollamaModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    new Notice('Ollama connection error.');
                }
            }
            if (plugin.settings.RESTAPIURLConnection.RESTAPIURL !== '') {
                const RESTAPIURLModels = await fetchRESTAPIURLModels(plugin);
                try {
                    RESTAPIURLModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    new Notice('OpenAI REST API URL connection error.');
                }
            }
            if (plugin.settings.APIConnections.openAI.APIKey && (plugin.settings.APIConnections.openAI.openAIBaseUrl !== DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl)) {
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
            if (plugin.settings.APIConnections.mistral.APIKey !== '') {
                const mistralModels = await fetchMistralModels(plugin);
                try {
                    mistralModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    new Notice('Mistral connection error.');
                }
            }
            if (plugin.settings.APIConnections.googleGemini.APIKey) {
                const googleGeminiModels = await fetchGoogleGeminiModels(plugin);
                try {
                    googleGeminiModels.forEach((model: string) => {
                        dropdown.addOption(model, model);
                        if (!plugin.settings.allModels.includes(model)) {
                            plugin.settings.allModels.push(model);
                        }
                    });
                }
                catch (error) {
                    new Notice('Mistral connection error.');
                }
            }
            if (plugin.settings.APIConnections.anthropic.APIKey) {
                addOptionsToDropdown(dropdown, ANTHROPIC_MODELS);
                for (const model of ANTHROPIC_MODELS) {
                    if (!plugin.settings.allModels.includes(model)) {
                        plugin.settings.allModels.push(model);
                    }
                }
            }
            dropdown
                .setValue(plugin.settings.general.model || DEFAULT_SETTINGS.general.model)
                .onChange(async (value) => {
                    plugin.settings.general.model = value;
                    await plugin.saveSettings();
                    const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                    if (modelName) {
                        modelName.textContent = 'Model: ' + plugin.settings.general.model.toLowerCase();
                    }
                })
        });

    new Setting(settingsContainer)
        .setName('System')
        .setDesc('System role prompt.')
        .addTextArea(text => text
            .setPlaceholder('You are a helpful assistant.')
            .setValue(plugin.settings.general.system_role !== undefined ? plugin.settings.general.system_role : DEFAULT_SETTINGS.general.system_role)
            .onChange(async (value) => {
                plugin.settings.general.system_role = value !== undefined ? value : DEFAULT_SETTINGS.general.system_role;
                await plugin.saveSettings();
            })
        );

    new Setting(settingsContainer)
        .setName('Max Tokens')
        .setDesc(descLink('The maximum number of tokens, or words, that the model is allowed to generate in its output.', 'https://platform.openai.com/tokenizer'))
        .addText(text => text
            .setPlaceholder('4096')
            .setValue(plugin.settings.general.max_tokens)
            .onChange(async (value) => {
                plugin.settings.general.max_tokens = value;
                await plugin.saveSettings();
            })
        );

    new Setting(settingsContainer)
        .setName('Temperature')
        .setDesc('Temperature controls how random the generated output is. Lower values make the text more predictable, while higher values make it more creative and unpredictable.')
        .addText(text => text
            .setPlaceholder('1.00')
            .setValue(plugin.settings.general.temperature)
            .onChange(async (value) => {
                const floatValue = parseFloat(value); // 10 is the radix parameter to ensure parsing is done in base 10

                // Determine if the float value is an integer
                if (!isNaN(floatValue)) {
                    if (!isNaN(floatValue)) {
                        if (floatValue < 0) {
                            plugin.settings.general.temperature = '0.00';
                        } else if (floatValue > 2) {
                            plugin.settings.general.temperature = '2.00';
                        } else {
                            plugin.settings.general.temperature = floatValue.toFixed(2);
                        }
                    } else {
                        plugin.settings.general.temperature = DEFAULT_SETTINGS.general.temperature;
                    }
                } else {
                    // Fallback to the default value if input is not a valid number
                    plugin.settings.general.temperature = DEFAULT_SETTINGS.general.temperature;
                }
                await plugin.saveSettings();
            })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(settingsContainer)
        .setName('Allow Reference Current Note')
        .setDesc('Allow chatbot to reference current active note during conversation.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.general.allowReferenceCurrentNote).onChange((value) => {
                plugin.settings.general.allowReferenceCurrentNote = value;
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