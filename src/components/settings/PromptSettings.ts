import { Setting, SettingTab, TFolder, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';


// Prompt Settings
export function addPromptSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Prompts'});

    const initialState = plugin.settings.togglePromptSettings;
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
            plugin.settings.togglePromptSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.togglePromptSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
        .setName('Prompt Folder Path')
        .setDesc('Reference your prompts from a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/Prompts/')
            .setValue(plugin.settings.prompts.promptFolderPath || DEFAULT_SETTINGS.prompts.promptFolderPath)
            .onChange(async (value) => {
                plugin.settings.prompts.promptFolderPath = value ? value : DEFAULT_SETTINGS.prompts.promptFolderPath;
                if (value) {
                    let folderPath = plugin.settings.prompts.promptFolderPath.trim();
                    
                    // Remove trailing '/' if it exists
                    if (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                    }
                    
                    const folder = app.vault.getAbstractFileByPath(folderPath);
                    
                    if (folder && folder instanceof TFolder) {
                        text.inputEl.style.borderColor = ''; 
                    } else {
                        text.inputEl.style.borderColor = 'red'; 
                    }
                }
                await plugin.saveSettings();
            })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(settingsContainer)
        .setName('Prompt')
        .setDesc('Select a prompt.')
        .addDropdown(dropdown => {
            dropdown.addOption('', '--EMPTY--');

            if (plugin.settings.prompts.promptFolderPath !== '') {
                // Fetching files from the specified folder
                const files = app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.prompts.promptFolderPath));
        
                // Sorting the files array alphabetically by file name
                files.sort((a, b) => a.name.localeCompare(b.name));

                // Adding each file name as a dropdown option
                files.forEach((file) => {
                    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Removing the file extension
                    dropdown.addOption(file.name, fileName);
                });
            }

            // Set the default option to the empty one
            dropdown.setValue('');

            dropdown
            .setValue(plugin.settings.prompts.prompt || DEFAULT_SETTINGS.prompts.prompt)
            .onChange(async (value) => {
                plugin.settings.prompts.prompt = value ? value : DEFAULT_SETTINGS.prompts.prompt;
                await plugin.saveSettings();
            })
        });
}