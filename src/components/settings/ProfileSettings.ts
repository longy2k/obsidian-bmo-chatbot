import { Setting, SettingTab, TFolder, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';


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
        dropdown.addOption('', '--EMPTY--');

        if (plugin.settings.profiles.profileFolderPath !== '') {
            // Fetching files from the specified folder
            const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));
    
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
        .setValue(plugin.settings.profiles.profile || DEFAULT_SETTINGS.profiles.profile)
        .onChange(async (value) => {
            plugin.settings.profiles.profile = value ? value : DEFAULT_SETTINGS.profiles.profile;
            await plugin.saveSettings();
        })
    });

    new Setting(settingsContainer)
        .setName('Profile Folder Path')
        .setDesc('Select a profile from a specified folder.')
        .addText(text => text
            .setPlaceholder('BMO/Profiles/')
            .setValue(plugin.settings.profiles.profileFolderPath || DEFAULT_SETTINGS.profiles.profileFolderPath)
            .onChange(async (value) => {
                plugin.settings.profiles.profileFolderPath = value ? value : DEFAULT_SETTINGS.profiles.profileFolderPath;
                if (value) {
                    let folderPath = plugin.settings.profiles.profileFolderPath.trim();
                    
                    // Remove trailing '/' if it exists
                    if (folderPath.endsWith('/')) {
                        folderPath = folderPath.substring(0, folderPath.length - 1);
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