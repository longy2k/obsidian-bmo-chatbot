import { Setting, SettingTab, TFolder, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';

export function addChatHistorySettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Chat History'});

    const initialState = plugin.settings.toggleChatHistorySettings;
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
            plugin.settings.toggleChatHistorySettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleChatHistorySettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
        .setName('Chat History Folder Path')
        .setDesc('Save your chat history in a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/History')
            .setValue(plugin.settings.chatHistory.chatHistoryPath || DEFAULT_SETTINGS.chatHistory.chatHistoryPath)
            .onChange(async (value) => {
                plugin.settings.chatHistory.chatHistoryPath = value ? value : DEFAULT_SETTINGS.chatHistory.chatHistoryPath;
                if (value) {
                    let folderPath = plugin.settings.chatHistory.chatHistoryPath.trim() || DEFAULT_SETTINGS.chatHistory.chatHistoryPath;
                    
                    // Remove trailing '/' if it exists
                    while (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                        plugin.settings.chatHistory.chatHistoryPath = folderPath;
                    }
                    
                    const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
                    
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
        .setName('Template File Path')
        .setDesc('Insert your template file path.')
        .addText(text => text
            .setPlaceholder('templates/bmo.md')
            .setValue(plugin.settings.chatHistory.templateFilePath || DEFAULT_SETTINGS.chatHistory.templateFilePath)
            .onChange(async (value) => {
                plugin.settings.chatHistory.templateFilePath = value ? value : DEFAULT_SETTINGS.chatHistory.templateFilePath;
                if (value) {
                    // Check if the provided file path ends with '.md', if not, append it
                    if (!plugin.settings.chatHistory.templateFilePath.endsWith('.md')) {
                        plugin.settings.chatHistory.templateFilePath += '.md';
                    }

                    await plugin.saveSettings();

                    const allFiles = plugin.app.vault.getFiles(); // Retrieve all files from the vault

                    // Check if the specified file path (including directories) exists in the array of files
                    const fileExists = allFiles.some(file => 
                        file.path.toLowerCase() === plugin.settings.chatHistory.templateFilePath.toLowerCase());
                        
                    if (fileExists) {
                        // console.log("File exists in vault!");
                        text.inputEl.style.borderColor = '';
                    } else {
                        // console.log("File does not exist in vault.");
                        text.inputEl.style.borderColor = 'red';
                    }
                } else {
                    // If the input is empty, reset the border color
                    text.inputEl.style.borderColor = '';
                    plugin.settings.chatHistory.templateFilePath = DEFAULT_SETTINGS.chatHistory.templateFilePath;
                }
            })
        );

    new Setting(settingsContainer)
        .setName('Enable Rename Note Title')
        .setDesc('Enable model to rename the note title when saving chat history.')
        .addToggle((toggle) =>
            toggle.setValue(plugin.settings.chatHistory.allowRenameNoteTitle).onChange((value) => {
                plugin.settings.chatHistory.allowRenameNoteTitle = value;
                plugin.saveSettings();
            })
        );
}