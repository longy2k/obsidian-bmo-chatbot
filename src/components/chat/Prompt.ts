import BMOGPT, { BMOSettings } from 'src/main';

export async function getPrompt(plugin: BMOGPT, settings: BMOSettings) {

    if (settings.prompts.prompt.trim() === '') {
        return '';
    }

    const promptFilePath = settings.prompts.promptFolderPath + '/' + settings.prompts.prompt;

    try {
        // Await the reading of the file and return its content
        const content = await plugin.app.vault.adapter.read(promptFilePath);
        // Remove YAML front matter if present
        const clearYamlContent = content.replace(/---[\s\S]+?---/, '').trim();
        return clearYamlContent;
    } catch (error) {
        console.error(`Error reading file ${promptFilePath}:`, error);
        return null; 
    }
}
