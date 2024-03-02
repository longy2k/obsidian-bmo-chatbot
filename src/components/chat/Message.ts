import { filenameMessageHistoryJSON, messageHistory } from 'src/view';
import { displayAppendButton, displayBotCopyButton, displayBotEditButton } from './Buttons';
import BMOGPT, { BMOSettings } from 'src/main';

// Add a new message to the messageHistory array and save it to the file
export async function addMessage(plugin: BMOGPT, input: string, messageType: 'userMessage' | 'botMessage', settings: BMOSettings, index: number) {
    const messageObj: { role: string; content: string } = {
        role: '',
        content: ''
    };

    if (messageType === 'userMessage') {
        messageObj.role = 'user';
        messageObj.content = input;
    } else if (messageType === 'botMessage') {
        messageObj.role = 'assistant';  
        messageObj.content = input;

        // Add buttons to botMessage after fetching message
        const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;

        const botMessageToolBarDiv = targetBotMessage?.querySelector('.botMessageToolBar');
        const buttonContainerDiv = document.createElement('div');
        buttonContainerDiv.className = 'button-container';
        botMessageToolBarDiv?.appendChild(buttonContainerDiv);

        // const newBotP = document.createElement('p');
        // newBotP.innerHTML = messageObj.content;
        
        if (!messageObj.content.includes('commandBotMessage') && !messageObj.content.includes('errorBotMessage')) {
            const editButton = displayBotEditButton(plugin, messageObj.content);
            const copyBotButton = displayBotCopyButton(settings, messageObj.content);
            const appendButton = displayAppendButton(plugin, settings, messageObj.content);
            buttonContainerDiv.appendChild(editButton);
            buttonContainerDiv.appendChild(copyBotButton);
            buttonContainerDiv.appendChild(appendButton);
        }

    }

    messageHistory.splice(index+1, 0, messageObj);

    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await plugin.app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error('Error writing to message history file:', error);
    }
}

// Add line break between consecutive <p> elements
export function addParagraphBreaks(messageBlock: { querySelectorAll: (arg0: string) =>  NodeListOf<HTMLElement>; }) {
    const paragraphs = messageBlock.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const nextSibling = p.nextElementSibling;
        if (nextSibling && nextSibling.nodeName === 'P') {
            const br = document.createElement('br');
            const parent = p.parentNode;
            if (parent) {
                parent.insertBefore(br, nextSibling);
            }
        }
    }
}
