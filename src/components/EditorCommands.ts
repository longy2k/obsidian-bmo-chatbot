import { BMOSettings } from "src/main";
import { fetchModelRenameTitle, fetchOpenAIAPIEditor, fetchOpenAIBaseAPIEditor, ollamaFetchDataEditor, requestUrlAnthropicAPIEditor, openAIRestAPIFetchDataEditor } from "./FetchModel";
import { MarkdownView, Notice } from "obsidian";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "src/view";

export async function renameTitleCommand(settings: BMOSettings) {
    let uniqueNameFound = false;
    let modelRenameTitle;
    let folderName = app.vault.getAbstractFileByPath(app.workspace.getActiveFile()?.path || '')?.parent?.path || '';
    const fileExtension = '.md';
    const allFiles = app.vault.getFiles(); // Retrieve all files from the vault
    const activeFile = app.workspace.getActiveFile();
    let fileContent = '';
  
    try {
        if (activeFile) {
        fileContent = await app.vault.read(activeFile);
        }
    
        if (folderName && !folderName.endsWith('/')) {
        folderName += '/';
        }
    
        // Function to check if a file name already exists
        const fileNameExists = (name: string | null) => {
            return allFiles.some((file) => file.path === folderName + name + fileExtension);
        };
    
        while (!uniqueNameFound) {
            modelRenameTitle = await fetchModelRenameTitle(settings, fileContent);
        
            if (!fileNameExists(modelRenameTitle)) {
                uniqueNameFound = true;
            }
        }
    
        const fileName = folderName + modelRenameTitle + fileExtension;
    
        if (activeFile) {
        app.vault.rename(activeFile, fileName);
        }

        new Notice("Renamed note title.");
    } catch (error) {
        console.error(error);
    }
}

// Prompt + Select + Generate command
export async function promptSelectGenerateCommand(settings: BMOSettings) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const select = view.editor.getSelection();
    if (view && select && select.trim() !== "") {
        // Fetch OpenAI API
        if (OPENAI_MODELS.includes(settings.model)) {
            try {
                new Notice("Generating...");
                const response = await fetchOpenAIAPIEditor(settings, select); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.openAIBaseModels.includes(settings.model)) {
            try {
                new Notice("Generating...");
                const response = await fetchOpenAIBaseAPIEditor(settings, select); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (ANTHROPIC_MODELS.includes(settings.model)) {
            try {
                new Notice("Generating...");
                const response = await requestUrlAnthropicAPIEditor(settings, select); 
                view.editor.replaceSelection(response);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.ollamaRestAPIUrl && settings.ollamaModels.includes(settings.model)) {
            try {
                new Notice("Generating...");
                const response = await ollamaFetchDataEditor(settings, select); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        else if (settings.openAIRestAPIUrl && settings.openAIRestAPIModels.includes(settings.model)){
            try {
                new Notice("Generating...");
                const response = await openAIRestAPIFetchDataEditor(settings, select); 
                // Replace the current selection with the response
                const cursorStart = view.editor.getCursor('from');
                view.editor.replaceSelection(response);

                // Calculate new cursor position based on the length of the response
                const cursorEnd = { 
                    line: cursorStart.line, 
                    ch: cursorStart.ch + response?.length 
                };

                // Keep the new text selected
                view.editor.setSelection(cursorStart, cursorEnd);
            }
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
            }
        }
        new Notice("Generation complete.");
    }
    else {
        new Notice("No text selected.");    
    }
}