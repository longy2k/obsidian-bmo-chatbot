import { Notice, Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';
import { fetchGoogleGeminiModels, fetchMistralModels, fetchOllamaModels, fetchOpenAIBaseModels, fetchOpenRouterModels, fetchRESTAPIURLModels } from '../FetchModelList';
import { ANTHROPIC_MODELS } from 'src/view';

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

    new Setting(settingsContainer)
    .setName('Model')
    .setDesc('Choose a model.')
    .addButton(button => button
        .setButtonText('Restore Default')
        .setIcon('rotate-cw')
        .setClass('clickable-icon')
        .onClick(async () => {
            // Refresh models when settings tab opens
            if (plugin.settings.OllamaConnection.RESTAPIURL !== '') {
                const models = await fetchOllamaModels(plugin);
                plugin.settings.OllamaConnection.ollamaModels = [];
                console.log('Ollama Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.OllamaConnection.ollamaModels.includes(model)) {
                        plugin.settings.OllamaConnection.ollamaModels.push(model);
                    }
                });
            }

            if (plugin.settings.RESTAPIURLConnection.RESTAPIURL !== '') {
                const models = await fetchRESTAPIURLModels(plugin);
                plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = [];
                console.log('REST API Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(model)) {
                        plugin.settings.RESTAPIURLConnection.RESTAPIURLModels.push(model);
                    }
                });
            }

            if (plugin.settings.APIConnections.anthropic.APIKey !== '') {
                const models = ANTHROPIC_MODELS
                plugin.settings.APIConnections.anthropic.anthropicModels = [];
                console.log('Anthropic Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.anthropic.anthropicModels.includes(model)) {
                        plugin.settings.APIConnections.anthropic.anthropicModels.push(model);
                    }
                });
            }

            if (plugin.settings.APIConnections.googleGemini.APIKey !== '') {
                const models = await fetchGoogleGeminiModels(plugin);
                plugin.settings.APIConnections.googleGemini.geminiModels = [];
                console.log('Google Gemini Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.googleGemini.geminiModels.includes(model)) {
                        plugin.settings.APIConnections.googleGemini.geminiModels.push(model);
                    }
                });
            }

            if (plugin.settings.APIConnections.mistral.APIKey !== '') {
                const models = await fetchMistralModels(plugin);
                plugin.settings.APIConnections.mistral.mistralModels = [];
                console.log('Mistral Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.mistral.mistralModels.includes(model)) {
                        plugin.settings.APIConnections.mistral.mistralModels.push(model);
                    }
                });
            }

            if (plugin.settings.APIConnections.openAI.APIKey !== '' || plugin.settings.APIConnections.openAI.openAIBaseUrl != DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl) {
                const models = await fetchOpenAIBaseModels(plugin);
                plugin.settings.APIConnections.openAI.openAIBaseModels = [];
                console.log('OpenAI Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.openAI.openAIBaseModels.includes(model)) {
                        plugin.settings.APIConnections.openAI.openAIBaseModels.push(model);
                    }
                });
            }

            if (plugin.settings.APIConnections.openRouter.APIKey !== '') {
                const models = await fetchOpenRouterModels(plugin);
                plugin.settings.APIConnections.openRouter.openRouterModels = [];
                console.log('OpenRouter Models:', models);
                models?.forEach((model: string) => {
                    if (!plugin.settings.APIConnections.openRouter.openRouterModels.includes(model)) {
                        plugin.settings.APIConnections.openRouter.openRouterModels.push(model);
                    }
                });
            }

            // Refresh the dropdown options
            const dropdown = settingsContainer.querySelector('select');
            if (dropdown) {
                dropdown.innerHTML = ''; // Clear existing options

                // Re-populate the dropdown with the updated models
                const ollamaModels = plugin.settings.OllamaConnection.ollamaModels;
                if (ollamaModels.length > 0) {
                    dropdown.add(new Option('---------- Ollama ----------', ''));
                    ollamaModels.forEach((model) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const restApiModels = plugin.settings.RESTAPIURLConnection.RESTAPIURLModels;
                if (restApiModels.length > 0) {
                    dropdown.add(new Option('---------- REST API ----------', ''));
                    restApiModels.forEach((model) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const anthropicModels = plugin.settings.APIConnections.anthropic.anthropicModels;
                if (anthropicModels.length > 0) {
                    dropdown.add(new Option('---------- Anthropic ----------', ''));
                    anthropicModels.forEach((model) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const googleGeminiModels = plugin.settings.APIConnections.googleGemini.geminiModels;
                if (googleGeminiModels.length > 0) {
                    dropdown.add(new Option('---------- Google Gemini ----------', ''));
                    googleGeminiModels.forEach((model) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const mistralModels = plugin.settings.APIConnections.mistral.mistralModels;
                if (mistralModels.length > 0) {
                    dropdown.add(new Option('---------- Mistral ----------', ''));
                    mistralModels.forEach((model) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const openAIModels = plugin.settings.APIConnections.openAI.openAIBaseModels;
                if (openAIModels.length > 0) {
                    dropdown.add(new Option('---------- OpenAI ----------', ''));
                    openAIModels.forEach((model: string) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                const openRouterModels = plugin.settings.APIConnections.openRouter.openRouterModels;
                if (openRouterModels.length > 0) {
                    dropdown.add(new Option('---------- OpenRouter ----------', ''));
                    openRouterModels.forEach((model: string) => {
                        dropdown.add(new Option(model, model));
                    });
                }

                dropdown.value = plugin.settings.general.model;

                const modelName = document.querySelector('#modelName');
                if (modelName) {
                    modelName.textContent = 'Model: ' + plugin.settings.general.model;
                }

                new Notice('Models reloaded.');
            }
        })
    )
    .addDropdown(async dropdown => {
        const ollamaModels = plugin.settings.OllamaConnection.ollamaModels;

        if (ollamaModels.length > 0) {
            dropdown.addOption('', '---------- Ollama ----------');
            ollamaModels.forEach((model) => {
                dropdown.addOption(model, model);
            });
        }

        const restApiModels = plugin.settings.RESTAPIURLConnection.RESTAPIURLModels;

        if (restApiModels.length > 0) {
            dropdown.addOption('', '---------- REST API ----------');
            restApiModels.forEach((model) => {
                dropdown.addOption(model, model);
            });
        }

        const anthropicModels = plugin.settings.APIConnections.anthropic.anthropicModels;

        if (anthropicModels.length > 0) {
            dropdown.addOption('', '---------- Anthropic ----------');
            anthropicModels.forEach((model) => {
                dropdown.addOption(model, model);
            });
        }

        const googleGeminiModels = plugin.settings.APIConnections.googleGemini.geminiModels;

        if (googleGeminiModels.length > 0) {
            dropdown.addOption('', '---------- Google Gemini ----------');
            googleGeminiModels.forEach((model) => {
                dropdown.addOption(model, model);
            });
        }

        const mistralModels = plugin.settings.APIConnections.mistral.mistralModels;

        if (mistralModels.length > 0) {
            dropdown.addOption('', '---------- Mistral ----------');
            mistralModels.forEach((model) => {
                dropdown.addOption(model, model);
            });
        }

        const openAIModels = plugin.settings.APIConnections.openAI.openAIBaseModels;

        if (openAIModels.length > 0) {
            dropdown.addOption('', '---------- OpenAI ----------');
            openAIModels.forEach((model: string) => {
                dropdown.addOption(model, model);
            });
        }

        const openRouterModels = plugin.settings.APIConnections.openRouter.openRouterModels;

        if (openRouterModels.length > 0) {
            dropdown.addOption('', '---------- OpenRouter ----------');
            openRouterModels.forEach((model: string) => {
                dropdown.addOption(model, model);
            });
        }

        dropdown
            .setValue(plugin.settings.general.model)
            .onChange(async (value) => {
                plugin.settings.general.model = value;
                await plugin.saveSettings();
                const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                if (modelName) {
                    modelName.textContent = 'model: ' + plugin.settings.general.model.toLowerCase();
                }
        });
    });


    // const currentProfileFile = `${plugin.settings.profiles.profileFolderPath}/${plugin.settings.profiles.profile}`
    // const currentProfile = plugin.app.vault.getAbstractFileByPath(currentProfileFile) as TFile;

    // new Setting(settingsContainer)
    //     .setName('System')
    //     .setDesc('System role prompt.')
    //     .addTextArea(text => text
    //         .setPlaceholder('You are a helpful assistant.')
    //         .setValue(plugin.settings.general.system_role !== undefined ? plugin.settings.general.system_role : DEFAULT_SETTINGS.general.system_role)
    //         .onChange(async (value) => {
    //             plugin.settings.general.system_role = value !== undefined ? value : DEFAULT_SETTINGS.general.system_role;
    //         })
    //         .inputEl.addEventListener('focusout', async () => {
    //             plugin.app.vault.modify(currentProfile, plugin.settings.general.system_role);
    //             await plugin.saveSettings();
    //             SettingTab.display();
    //         })
    //     );

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
        .setName('Enable Reference Current Note')
        .setDesc('Enable chatbot to reference current active note during conversation.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.general.enableReferenceCurrentNote).onChange((value) => {
                plugin.settings.general.enableReferenceCurrentNote = value;
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