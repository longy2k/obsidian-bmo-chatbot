import { Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";

export function addPromptSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Prompts'});

    new Setting(containerEl)
        .setName('Prompt Folder Path')
        .setDesc('Reference your prompts from a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/Prompts')
            .setValue(plugin.settings.promptFolderPath || DEFAULT_SETTINGS.promptFolderPath)
            .onChange(async (value) => {
                plugin.settings.promptFolderPath = value ? value : DEFAULT_SETTINGS.promptFolderPath;
                await plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName('Prompt')
        .setDesc('Select a prompt.')
        .addDropdown(dropdown => {
            // Adding an empty option as the default
            dropdown.addOption('', '');

            // Fetching files from the specified folder
            const files = app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.promptFolderPath));
    
            // Sorting the files array alphabetically by file name
            files.sort((a, b) => a.name.localeCompare(b.name));

            // Adding each file name as a dropdown option
            files.forEach((file) => {
                dropdown.addOption(file.name, file.name);
            });

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