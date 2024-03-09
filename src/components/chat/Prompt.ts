import BMOGPT, { BMOSettings } from 'src/main';

export async function getPrompt(plugin: BMOGPT, settings: BMOSettings) {

    if (settings.profiles.profile.trim() === '') {
        return '';
    }

    const profileFilePath = settings.profiles.profileFolderPath + '/' + settings.profiles.profile;

    try {
        // Await the reading of the file and return its content
        const content = await plugin.app.vault.adapter.read(profileFilePath);
        // Remove YAML front matter if present
        const clearYamlContent = content.replace(/---[\s\S]+?---/, '').trim();
        return clearYamlContent;
    } catch (error) {
        console.error(`Error reading file ${profileFilePath}:`, error);
        return null; 
    }
}
