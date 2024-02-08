import { BMOSettings } from "src/main";

let referenceCurrentNoteContent = '';

// Reference Current Note Indicator
export async function getActiveFileContent(settings: BMOSettings) {
    const dotElement = document.querySelector('.dotIndicator');
    referenceCurrentNoteContent = '';
    if (settings.general.allowReferenceCurrentNote === true) {
        if (dotElement) {
            (dotElement as HTMLElement).style.backgroundColor = '#da2c2c';
            referenceCurrentNoteContent = '';
        }
        const activeFile = app.workspace.getActiveFile();
        if (activeFile?.extension === 'md') {
            if (dotElement) {
                (dotElement as HTMLElement).style.backgroundColor = 'green';
            }
            const content = await app.vault.read(activeFile);
            const clearYamlContent = content.replace(/---[\s\S]+?---/, '').trim();
            referenceCurrentNoteContent = 'Reference Note:' + 
                          '\n\n' + clearYamlContent + '\n\n';
        }
    }
    return referenceCurrentNoteContent;
}

export function getCurrentNoteContent() {
    return referenceCurrentNoteContent;
}