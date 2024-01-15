import { TFile } from "obsidian";

// Reference Current Note Indicator
export async function getActiveFileContent(file: TFile) {
    const activeFile = app.workspace.getActiveFile();
    const dotElement = document.querySelector('.dotIndicator');
    let currentNote = '';
    if (activeFile?.extension === 'md') {
        const content = await app.vault.read(activeFile);
        currentNote = 'You will refer to this content if the user is asking for anything related to their notes:' + 
                      '\n' + content + '\n';
        if (dotElement) {
            (dotElement as HTMLElement).style.backgroundColor = 'green';
        }
    } else {
        if (dotElement) {
            (dotElement as HTMLElement).style.backgroundColor = '#da2c2c';
        }
    }
    return currentNote;
}