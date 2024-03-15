import { Setting, SettingTab, TFile, TFolder, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS, updateSettingsFromFrontMatter } from 'src/main';


// Profile Settings
export function addProfileSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Profiles'});

    const initialState = plugin.settings.toggleProfileSettings;
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
            plugin.settings.toggleProfileSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleProfileSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('Profile')
    .setDesc('Select a profile.')
    .addDropdown(dropdown => {

        if (plugin.settings.profiles.profileFolderPath !== '') {
            // Fetching files from the specified folder
            const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));
        
            // Sorting the files array alphabetically by file name
            files.sort((a, b) => a.name.localeCompare(b.name));
        
            const dataFolderPath = './.obsidian/plugins/bmo-chatbot/data/';
            
            if (!plugin.app.vault.getAbstractFileByPath(dataFolderPath)) {
                plugin.app.vault.adapter.mkdir(dataFolderPath);
            }
        
            files.forEach((file) => {
                if (file instanceof TFile) {
                    const fileName = file.basename;
                    const newFileName = `messageHistory_${fileName}.json`;
                    const newFilePath = `${dataFolderPath}${newFileName}`;
        
                    plugin.app.vault.create(newFilePath, '')
                    .catch((err) => {
                        // If the file already exists, log a message
                        if (err.message === 'File already exists.') {
                            // console.log(`File ${newFilePath} already exists. Skipping creation.`);
                        } else {
                            // For any other error, rethrow it
                            throw err;
                        }
                    });

                    // Adding the file name as a dropdown option
                    dropdown.addOption(file.name, fileName);
                }
            });

        }

        dropdown
        .setValue(plugin.settings.profiles.profile || DEFAULT_SETTINGS.profiles.profile)
        .onChange(async (value) => {
            plugin.settings.profiles.profile = value ? value : DEFAULT_SETTINGS.profiles.profile;
            const profileFilePath = plugin.settings.profiles.profileFolderPath + '/' + plugin.settings.profiles.profile;
            const currentProfile = plugin.app.vault.getAbstractFileByPath(profileFilePath) as TFile;
            plugin.activateView();
            await updateSettingsFromFrontMatter(plugin, currentProfile);
            await plugin.saveSettings();
            SettingTab.display();
        })
        
    });

    new Setting(settingsContainer)
        .setName('Profile Folder Path')
        .setDesc('Select a profile from a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/Profiles')
            .setValue(plugin.settings.profiles.profileFolderPath || DEFAULT_SETTINGS.profiles.profileFolderPath)
            .onChange(async (value) => {
                plugin.settings.profiles.profileFolderPath = value ? value : DEFAULT_SETTINGS.profiles.profileFolderPath;
                if (value) {
                    let folderPath = plugin.settings.profiles.profileFolderPath.trim() || DEFAULT_SETTINGS.profiles.profileFolderPath;
                    
                    // Remove trailing '/' if it exists
                    while (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
                        plugin.settings.profiles.profileFolderPath = folderPath;
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
}