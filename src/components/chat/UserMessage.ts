import { BMOSettings, DEFAULT_SETTINGS } from "src/main";
import { colorToHex } from "src/utils/ColorConverter";
import { displayEditButton, displayTrashButton, displayUserCopyButton, regenerateUserButton } from "./Buttons";
import { ANTHROPIC_MODELS } from "src/view";
import { marked } from "marked";

export function displayUserMessage(settings: BMOSettings, referenceCurrentNoteContent: string, message: string) {
    const userMessageDiv = document.createElement("div");
    userMessageDiv.className = "userMessage";
    userMessageDiv.style.backgroundColor = colorToHex(settings.userMessageBackgroundColor || 
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());

    const userMessageToolBarDiv = document.createElement("div");
    userMessageToolBarDiv.className = "userMessageToolBar";

    const buttonContainerDiv = document.createElement("div");
    buttonContainerDiv.className = "button-container";

    const userNameSpan = document.createElement("span");
    userNameSpan.className = "userName";
    userNameSpan.textContent = settings.userName || DEFAULT_SETTINGS.userName;
    const userP = document.createElement("p");

    const regenerateButton = regenerateUserButton(settings, referenceCurrentNoteContent);
    const editButton = displayEditButton(settings, referenceCurrentNoteContent, userP);
    const copyUserButton = displayUserCopyButton(userP);
    const trashButton = displayTrashButton();
    
    userMessageToolBarDiv.appendChild(userNameSpan);
    userMessageToolBarDiv.appendChild(buttonContainerDiv);

    if (!message.startsWith("/")) {
        buttonContainerDiv.appendChild(regenerateButton);
        buttonContainerDiv.appendChild(editButton);
    }

    buttonContainerDiv.appendChild(copyUserButton);
    buttonContainerDiv.appendChild(trashButton);
    userMessageDiv.appendChild(userMessageToolBarDiv);
    userMessageDiv.appendChild(userP);

    if (ANTHROPIC_MODELS.includes(settings.model)) {
        const fullString = message;
        const cleanString = fullString.split(' ').slice(1).join(' ').trim();
        userP.innerHTML = marked(cleanString);
    } else {
        userP.innerHTML = marked(message);
    }

    return userMessageDiv;
}