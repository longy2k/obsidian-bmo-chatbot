import { BMOSettings } from "src/main";
import { fetchModelRenameTitle } from "./FetchModel";
import { Notice } from "obsidian";

export async function renameTitle(BMOSettings: BMOSettings) {
    let uniqueNameFound = false;
    let modelRenameTitle;
    let folderName = BMOSettings.chatHistoryPath;
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
            modelRenameTitle = await fetchModelRenameTitle(BMOSettings, fileContent);
        
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