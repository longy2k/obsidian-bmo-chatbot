import BMOGPT, { BMOSettings, DEFAULT_SETTINGS } from 'src/main';
import { colorToHex } from 'src/utils/ColorConverter';
import { displayUserEditButton, displayTrashButton, displayUserCopyButton, regenerateUserButton } from './Buttons';
import { marked } from 'marked';

export function displayUserMessage(plugin: BMOGPT, settings: BMOSettings, message: string) {
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'userMessage';
    userMessageDiv.style.backgroundColor = colorToHex(settings.appearance.userMessageBackgroundColor || 
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim());

    const userMessageToolBarDiv = document.createElement('div');
    userMessageToolBarDiv.className = 'userMessageToolBar';

    const buttonContainerDiv = document.createElement('div');
    buttonContainerDiv.className = 'button-container';

    const userNameSpan = document.createElement('span');
    userNameSpan.className = 'userName';
    userNameSpan.textContent = settings.appearance.userName || DEFAULT_SETTINGS.appearance.userName;
    const userP = document.createElement('p');

    const regenerateButton = regenerateUserButton(plugin, settings);
    const editButton = displayUserEditButton(plugin, settings, userP);
    const copyUserButton = displayUserCopyButton(userP);
    const trashButton = displayTrashButton(plugin);
    
    userMessageToolBarDiv.appendChild(userNameSpan);
    userMessageToolBarDiv.appendChild(buttonContainerDiv);

    if (!message.startsWith('/')) {
        buttonContainerDiv.appendChild(regenerateButton);
        buttonContainerDiv.appendChild(editButton);
    }

    buttonContainerDiv.appendChild(copyUserButton);
    buttonContainerDiv.appendChild(trashButton);
    userMessageDiv.appendChild(userMessageToolBarDiv);
    userMessageDiv.appendChild(userP);

    userP.innerHTML = marked(message);

    return userMessageDiv;
}