import { BMOSettings } from "src/main";

export async function getPrompt(settings: BMOSettings) {

    if (!settings.prompt || settings.prompt.trim() === '') {
        return '';
    }

    const promptFilePath = settings.promptFolderPath + settings.prompt;

    try {
        // Await the reading of the file and return its content
        const content = await app.vault.adapter.read(promptFilePath);
        return content;
    } catch (error) {
        console.error(`Error reading file ${promptFilePath}:`, error);
        return null; 
    }
}
