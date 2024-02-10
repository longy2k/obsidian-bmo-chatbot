import { BMOSettings, DEFAULT_SETTINGS } from "src/main";
import { colorToHex } from "src/utils/ColorConverter";
import { displayUserEditButton, displayTrashButton, displayUserCopyButton, regenerateUserButton } from "./Buttons";
import { ANTHROPIC_MODELS } from "src/view";
import { marked } from "marked";

export function displayUserMessage(settings: BMOSettings, message: string) {
    const userMessageDiv = document.createElement("div");
    userMessageDiv.className = "userMessage";
    userMessageDiv.style.backgroundColor = colorToHex(settings.appearance.userMessageBackgroundColor || 
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim());

    const userMessageToolBarDiv = document.createElement("div");
    userMessageToolBarDiv.className = "userMessageToolBar";

    const buttonContainerDiv = document.createElement("div");
    buttonContainerDiv.className = "button-container";

    const userNameSpan = document.createElement("span");
    userNameSpan.className = "userName";
    userNameSpan.textContent = settings.appearance.userName || DEFAULT_SETTINGS.appearance.userName;
    const userP = document.createElement("p");

    const regenerateButton = regenerateUserButton(settings);
    const editButton = displayUserEditButton(settings, userP);
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

    if (ANTHROPIC_MODELS.includes(settings.general.model)) {
        const fullString = message;
        const cleanString = fullString.split(' ').slice(1).join(' ').trim();
        userP.innerHTML = marked(cleanString);
    } else {
        userP.innerHTML = marked(message);
    }

    return userMessageDiv;
}