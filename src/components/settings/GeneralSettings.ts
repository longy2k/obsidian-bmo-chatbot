import { DropdownComponent, Notice, Setting, SettingTab, setIcon } from 'obsidian';
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

    const createModelDropdown = (dropdown: DropdownComponent) => {
        const modelGroups = [
            { name: 'Ollama Models', models: plugin.settings.OllamaConnection.ollamaModels },
            { name: 'REST API Models', models: plugin.settings.RESTAPIURLConnection.RESTAPIURLModels },
            { name: 'Anthropic Models', models: plugin.settings.APIConnections.anthropic.anthropicModels },
            { name: 'Google Gemini Models', models: plugin.settings.APIConnections.googleGemini.geminiModels },
            { name: 'Mistral Models', models: plugin.settings.APIConnections.mistral.mistralModels },
            { name: 'OpenAI-Based Models', models: plugin.settings.APIConnections.openAI.openAIBaseModels },
            { name: 'OpenRouter Models', models: plugin.settings.APIConnections.openRouter.openRouterModels }
        ];
    
        const selectEl = dropdown.selectEl;
        selectEl.innerHTML = ''; // Clear existing options

        // Add the default model option
        const defaultOption = selectEl.createEl('option', {
            value: '',
            text: 'No Model'
        });
        if (plugin.settings.general.model === 'No Model') {
            defaultOption.selected = true;
        }
    
        modelGroups.forEach(group => {
            if (group.models.length > 0) {
                const optgroup = selectEl.createEl('optgroup');
                optgroup.label = group.name;
                group.models.forEach(model => {
                    const option = optgroup.createEl('option', {
                        value: model,
                        text: model
                    });
                    if (model === plugin.settings.general.model) {
                        option.selected = true;
                    }
                });
            }
        });
    
        dropdown.onChange(async (value) => {
            plugin.settings.general.model = value;
            await plugin.saveSettings();
        });
    };
    
    let modelDropdown: DropdownComponent;
    
    new Setting(settingsContainer)
        .setName('Model')
        .setDesc('Choose a model.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {

                new Notice('Reloading...');

                // Refresh models when settings tab opens
                if (plugin.settings.OllamaConnection.RESTAPIURL !== '') {
                    const models = await fetchOllamaModels(plugin);
                    plugin.settings.OllamaConnection.ollamaModels = models || [];
                }
    
                if (plugin.settings.RESTAPIURLConnection.RESTAPIURL !== '') {
                    const models = await fetchRESTAPIURLModels(plugin);
                    plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = models || [];
                }
    
                if (plugin.settings.APIConnections.anthropic.APIKey !== '') {
                    const models = ANTHROPIC_MODELS;
                    plugin.settings.APIConnections.anthropic.anthropicModels = models || [];
                }
    
                if (plugin.settings.APIConnections.googleGemini.APIKey !== '') {
                    const models = await fetchGoogleGeminiModels(plugin);
                    plugin.settings.APIConnections.googleGemini.geminiModels = models || [];
                }
    
                if (plugin.settings.APIConnections.mistral.APIKey !== '') {
                    const models = await fetchMistralModels(plugin);
                    plugin.settings.APIConnections.mistral.mistralModels = models || [];
                }
    
                if (plugin.settings.APIConnections.openAI.APIKey !== '' || plugin.settings.APIConnections.openAI.openAIBaseUrl != DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl) {
                    const models = await fetchOpenAIBaseModels(plugin);
                    plugin.settings.APIConnections.openAI.openAIBaseModels = models || [];
                }
    
                if (plugin.settings.APIConnections.openRouter.APIKey !== '') {
                    const models = await fetchOpenRouterModels(plugin);
                    plugin.settings.APIConnections.openRouter.openRouterModels = models || [];
                }
    
                // After fetching all models, recreate the dropdown
                if (modelDropdown) {
                    createModelDropdown(modelDropdown);
                }
    
                new Notice('Models reloaded.');
            })
        )
        .addDropdown(dropdown => {
            modelDropdown = dropdown;
            createModelDropdown(dropdown);
        });

    new Setting(settingsContainer)
        .setName('Max Tokens')
        .setDesc('The maximum number of tokens, or words, that the model is allowed to generate in its output. Some models require a minimum number of tokens to be set. The default value is empty.')
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
}