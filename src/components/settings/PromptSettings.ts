import { Setting, SettingTab, TFolder } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";


// Prompt Settings
export function addPromptSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Prompts'});

    new Setting(containerEl)
        .setName('Prompt Folder Path')
        .setDesc('Reference your prompts from a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/Prompts/')
            .setValue(plugin.settings.promptFolderPath || DEFAULT_SETTINGS.promptFolderPath)
            .onChange(async (value) => {
                plugin.settings.promptFolderPath = value ? value : DEFAULT_SETTINGS.promptFolderPath;
                if (value) {
                    let folderPath = plugin.settings.promptFolderPath.trim();
                    
                    // Remove trailing '/' if it exists
                    if (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                    }
                    
                    const folder = app.vault.getAbstractFileByPath(folderPath);
                    
                    if (folder && folder instanceof TFolder) {
                        text.inputEl.style.borderColor = ""; 
                    } else {
                        text.inputEl.style.borderColor = "red"; 
                    }
                }
                await plugin.saveSettings();
            })
            .inputEl.addEventListener('focusout', async () => {
                SettingTab.display();
            })
        );

    new Setting(containerEl)
        .setName('Prompt')
        .setDesc('Select a prompt.')
        .addDropdown(dropdown => {
            dropdown.addOption('', '--EMPTY--');

            if (plugin.settings.promptFolderPath !== '') {
                // Fetching files from the specified folder
                const files = app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.promptFolderPath));
        
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
            .setValue(plugin.settings.prompt || DEFAULT_SETTINGS.prompt)
            .onChange(async (value) => {
                plugin.settings.prompt = value ? value : DEFAULT_SETTINGS.prompt;
                await plugin.saveSettings();
            })
        });
}