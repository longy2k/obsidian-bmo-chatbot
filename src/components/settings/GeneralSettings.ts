import { DropdownComponent, Notice, Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';
import { ANTHROPIC_MODELS } from 'src/view';
import { fetchGoogleGeminiModels, fetchMistralModels, fetchOllamaModels, fetchOpenAIBaseModels, fetchOpenRouterModels, fetchRESTAPIURLModels } from '../FetchModelList';

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
        .addDropdown(async dropdown => {
            await populateDropdownWithModels(plugin, dropdown);
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

async function populateDropdownWithModels(plugin: BMOGPT, dropdown: DropdownComponent) {
    // Initialize an empty array to store all unique models
    plugin.settings.allModels = [];

    // Helper function to fetch models based on the source type
    async function fetchModels(sourceType: string) {
        switch (sourceType) {
            case 'ollama':
                return await fetchOllamaModels(plugin);
            case 'RESTAPIURL':
                return await fetchRESTAPIURLModels(plugin);
            case 'anthropic':
                return ANTHROPIC_MODELS;
            case 'googleGemini':
                return await fetchGoogleGeminiModels(plugin);
            case 'mistral':
                return await fetchMistralModels(plugin);
            case 'openAI':
                return await fetchOpenAIBaseModels(plugin);
            case 'openRouter':
                return await fetchOpenRouterModels(plugin);
            default:
                return [];
        }
    }

    // Helper function to add models to the dropdown and allModels array
    function addModelsToDropdownAndList(models: string[]) {
        models.forEach((model) => {
            dropdown.addOption(model, model);
            if (!plugin.settings.allModels.includes(model)) {
                plugin.settings.allModels.push(model);
            }
        });
    }

    // Define model sources and conditions for fetching
    const modelSources = [
        { type: 'ollama', condition: plugin.settings.OllamaConnection.RESTAPIURL },
        { type: 'RESTAPIURL', condition: plugin.settings.RESTAPIURLConnection.RESTAPIURL },
        { type: 'anthropic', condition: plugin.settings.APIConnections.anthropic.APIKey },
        { type: 'googleGemini', condition: plugin.settings.APIConnections.googleGemini.APIKey },
        { type: 'mistral', condition: plugin.settings.APIConnections.mistral.APIKey },
        { type: 'openAI', condition: plugin.settings.APIConnections.openAI.APIKey },
        { type: 'openRouter', condition: plugin.settings.APIConnections.openRouter.APIKey },
    ];

    // Process each source to fetch and add models
    for (const { type, condition } of modelSources) {
        if (condition) {
            try {
                const models = await fetchModels(type);
                addModelsToDropdownAndList(models);
            } catch (error) {
                console.error(`Error fetching models from ${type}:`, error);
                new Notice(`${type.charAt(0).toUpperCase() + type.slice(1)} connection error.`);
            }
        }
    }

}
