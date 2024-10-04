import { MarkdownRenderer, Notice, requestUrl, setIcon } from 'obsidian';
import BMOGPT, { BMOSettings } from '../main';
import { messageHistory } from '../view';
import { addMessage, addParagraphBreaks, updateUnresolvedInternalLinks } from './chat/Message';
import { displayErrorBotMessage, displayLoadingBotMessage } from './chat/BotMessage';
import { getActiveFileContent, getCurrentNoteContent } from './editor/ReferenceCurrentNote';
import { getPrompt } from './chat/Prompt';

let abortController: AbortController | null = null;

// Fetch response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(ollamaRESTAPIURL + '/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt + referenceCurrentNoteContent },
                    ...messageHistoryAtIndex
                ],
                stream: false,
                options: ollamaParametersOptions(settings),
            }),
            signal: abortController.signal,
        });

        const responseData = await response.json();
        let message = responseData.message.content;

        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');

            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

                        // Request was aborted
                        if (messageContainerEl) {
                            const targetUserMessage = messageContainerElDivs[index];
                            const targetBotMessage = targetUserMessage.nextElementSibling;
            
                            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                            const loadingEl = targetBotMessage?.querySelector('#loading');
            
                            if (messageBlock && loadingEl) {
                                targetBotMessage?.removeChild(loadingEl);
                                messageBlock.textContent = 'SYSTEM: Response aborted.';
                                addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
                            }
                        }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

// Fetch response from Ollama (stream)
export async function fetchOllamaResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const url = ollamaRESTAPIURL + '/api/chat';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);

    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: ollamaParametersOptions(settings),
            }),
            signal: abortController.signal
        })

        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: true }) || '';
            // Splitting the chunk to parse JSON messages separately
            const parts = chunk.split('\n');
            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part);
                    if (parsedChunk.done !== true) {
                        const content = parsedChunk.message.content;
                        message += content;
                        }
                    } catch (err) {
                        console.error('Error parsing JSON:', err);
                        console.log('Part with error:', part);
                        parsedChunk = {response: '{_e_}'};
                    }
                }

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });
        

        addMessage(plugin, message.trim(), 'botMessage', settings, index);   
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Ollama:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from openai-based rest api url
export async function fetchRESTAPIURLResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();
 
    try {
        const response = await requestUrl({
            url: settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || -1,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        let message = response.json.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);

    }
}

// Fetch response from openai-based rest api url (stream)
export async function fetchRESTAPIURLResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const RESTAPIURL = settings.RESTAPIURLConnection.RESTAPIURL;

    if (!RESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const url = RESTAPIURL + '/chat/completions';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })

        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Ollama:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from Anthropic
export async function fetchAnthropicResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await requestUrl({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.APIConnections.anthropic.APIKey,
            },
            body: JSON.stringify({
                model: settings.general.model,
                system: settings.general.system_role + prompt + referenceCurrentNoteContent,
                messages: [
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        let message = response.json.content[0].text;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }

}

// Fetch response from Google Gemini
export async function fetchGoogleGeminiResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);
    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    // Function to convert messageHistory to Google Gemini format
    const convertMessageHistory = (messageHistory: { role: string; content: string }[]) => {
        // Clone the messageHistory to avoid mutating the original array
        const modifiedMessageHistory = [...messageHistory];
        
        const convertedMessageHistory = modifiedMessageHistory.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : role,
            parts: [{ text: content }]
        }));
        
        const contents = [
            ...convertedMessageHistory
        ];

        return { contents };
    };
    
    // Use the function to convert your message history
    const convertedMessageHistory = convertMessageHistory(messageHistoryAtIndex);

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {        
        const API_KEY = settings.APIConnections.googleGemini.APIKey;
        const MODEL = settings.general.model;
    
        const url = 'https://generativelanguage.googleapis.com/v1beta/' + MODEL + ':generateContent?key=' + API_KEY;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `System prompt: \n\n ${plugin.settings.general.system_role} ${prompt} ${referenceCurrentNoteContent} Respond understood if you got it.` }],
                },
                {
                  role: 'model',
                  parts: [{ text: 'Understood.' }],
                },
                ...convertedMessageHistory.contents,
              ],
              generationConfig: {
                stopSequences: '',
                temperature: parseInt(settings.general.temperature),
                maxOutputTokens: settings.general.max_tokens || 4096,
                topP: 0.8,
                topK: 10
              }
            }),
            signal: abortController?.signal,
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const responseData = await response.json();
          let message = responseData.candidates[0].content.parts[0].text;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

                        // Request was aborted
                        if (messageContainerEl) {
                            const targetUserMessage = messageContainerElDivs[index];
                            const targetBotMessage = targetUserMessage.nextElementSibling;
            
                            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                            const loadingEl = targetBotMessage?.querySelector('#loading');
            
                            if (messageBlock && loadingEl) {
                                targetBotMessage?.removeChild(loadingEl);
                                messageBlock.textContent = 'SYSTEM: Response aborted.';
                                addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
                            }
                        }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

export async function fetchGoogleGeminiResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    // Function to convert messageHistory to Google Gemini format
    const convertMessageHistory = (messageHistory: { role: string; content: string }[]) => {
        // Clone the messageHistory to avoid mutating the original array
        const modifiedMessageHistory = [...messageHistory];
        
        const convertedMessageHistory = modifiedMessageHistory.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : role,
            parts: [{ text: content }]
        }));
        
        const contents = [
            ...convertedMessageHistory
        ];

        return { contents };
    };

    const convertedMessageHistory = convertMessageHistory(messageHistoryAtIndex);

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const API_KEY = settings.APIConnections.googleGemini.APIKey;
        const MODEL = settings.general.model;
    
        const url = 'https://generativelanguage.googleapis.com/v1beta/' + MODEL + ':streamGenerateContent?alt=sse&key=' + API_KEY;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `System prompt: \n\n ${plugin.settings.general.system_role} ${prompt} ${referenceCurrentNoteContent} Respond understood if you got it.` }],
                },
                {
                  role: 'model',
                  parts: [{ text: 'Understood.' }],
                },
                ...convertedMessageHistory.contents,
              ],
              generationConfig: {
                stopSequences: '',
                temperature: parseInt(settings.general.temperature),
                maxOutputTokens: settings.general.max_tokens || 4096,
                topP: 0.8,
                topK: 10
              }
            }),
            signal: abortController?.signal,
          });

        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: true }) || '';
            // Splitting the chunk to parse JSON messages separately
            const parts = chunk.split('\n');
            
            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                if (part.startsWith('data: ')) {
                    const jsonData = part.slice(6); // Remove the "data: " prefix
                    let parsedChunk;
                    try {
                        parsedChunk = JSON.parse(jsonData);
                        if (parsedChunk.done !== true) {
                            const content = parsedChunk.candidates[0].content.parts[0].text;
                            message += content;
                        }
                    } catch (err) {
                        console.error('Error parsing JSON:', err);
                        console.log('Part with error:', jsonData);
                        parsedChunk = { response: '{_e_}' };
                    }
                }
            }

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });
        

        addMessage(plugin, message.trim(), 'botMessage', settings, index);   
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Google Gemini:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from Mistral
export async function fetchMistralResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
            signal: abortController?.signal,
        });
            
        const data = await response.json();
        let message = data.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }
                
                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

                        // Request was aborted
                        if (messageContainerEl) {
                            const targetUserMessage = messageContainerElDivs[index];
                            const targetBotMessage = targetUserMessage.nextElementSibling;
            
                            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                            const loadingEl = targetBotMessage?.querySelector('#loading');
            
                            if (messageBlock && loadingEl) {
                                targetBotMessage?.removeChild(loadingEl);
                                messageBlock.textContent = 'SYSTEM: Response aborted.';
                                addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
                            }
                        }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }

}

// Fetch response Mistral (stream)
export async function fetchMistralResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    abortController = new AbortController();
    const prompt = await getPrompt(plugin, settings);

    let message = '';

    let isScroll = false;

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })

        // Change the submit button to a stop button
        setIcon(submitButton, 'square');
        submitButton.title = 'stop';

        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);

                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Mistral:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch OpenAI-Based API
export async function fetchOpenAIAPIResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    abortController = new AbortController();

    const prompt = await getPrompt(plugin, settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);
    
    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(`${plugin.settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${plugin.settings.APIConnections.openAI.APIKey}`,
            },
            body: JSON.stringify({
              model: settings.general.model,
              max_tokens: parseInt(settings.general.max_tokens),
              stream: false,
              messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex,
              ],
            }),
            signal: abortController.signal,
        });
          
        const data = await response.json();
        let message = data.choices[0].message.content || '';
        
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');

            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (message != null) {
            // Define regex patterns for the unwanted tags and their content
            const regexPatterns = [
                /<block-rendered>[\s\S]*?<\/block-rendered>/g,
                /<note-rendered>[\s\S]*?<\/note-rendered>/g,
                /<note-rendered>[\s\S]*?<\/note-rendered>/g
            ];

            // Clean the message content by removing the unwanted tags and their content
            regexPatterns.forEach(pattern => {
                message = message.replace(pattern, '').trim();
            });
            addMessage(plugin, message.trim(), 'botMessage', settings, index);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                    addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

export async function fetchAzureOpenAIAPIResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
	abortController = new AbortController();

	const prompt = await getPrompt(plugin, settings);

	let message = '';
	let isScroll = false;

	const filteredMessageHistory = filterMessageHistory(messageHistory);
	const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

	const messageContainerEl = document.querySelector('#messageContainer');
	const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

	const botMessageDiv = displayLoadingBotMessage(settings);

	messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
	botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

	const targetUserMessage = messageContainerElDivs[index];
	const targetBotMessage = targetUserMessage.nextElementSibling;

	await getActiveFileContent(plugin, settings);
	const referenceCurrentNoteContent = getCurrentNoteContent();

	const submitButton = document.querySelector('.submit-button') as HTMLElement;
	// Change the submit button to a stop button
	setIcon(submitButton, 'square');
	submitButton.title = 'stop';
	submitButton.addEventListener('click', () => {
		if (submitButton.title === 'stop') {
			const controller = getAbortController();
			if (controller) {
				controller.abort();
			}
		}
	});

	try {
		const {azureOpenAIBaseUrl, deploymentName, APIKey} = plugin.settings.APIConnections.azureOpenAI
		const response = await fetch(`${azureOpenAIBaseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"api-key": APIKey
			},
			body: JSON.stringify({
				max_tokens: parseInt(settings.general.max_tokens),
				stream: true,
				messages: [
					{
						role: "system",
						content: settings.general.system_role + prompt + referenceCurrentNoteContent
					},
					...messageHistoryAtIndex
				]
			}),
			signal: abortController.signal
		})


		if (!response.ok) {
			new Notice(`HTTP error! Status: ${response.status}`);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		if (!response.body) {
			new Notice('Response body is null or undefined.');
			throw new Error('Response body is null or undefined.');
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let reading = true;

		while (reading) {
			const { done, value } = await reader.read();
			if (done) {
				reading = false;
				break;
			}

			const chunk = decoder.decode(value, { stream: true }) || '';
			const parts = chunk.split('\n');


			for (const part of parts) {
				if (part.includes('data: [DONE]')) {
					reading = false;
					break;
				}

				try {
					const trimmedPart = part.replace(/^data: /, '').trim();
					if (trimmedPart) {
						const data = JSON.parse(trimmedPart);
						if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
							const content = data.choices[0].delta.content;
							message += content;
						}
					}
				} catch (err) {
					console.error('Error parsing JSON:', err);
					console.log('Part with error:', part);
				}
			}

			if (messageContainerEl) {

				const messageBlock = targetBotMessage?.querySelector('.messageBlock');
				const loadingEl = targetBotMessage?.querySelector('#loading');

				if (messageBlock) {
					if (loadingEl) {
						targetBotMessage?.removeChild(loadingEl);
					}

					// Clear the messageBlock for re-rendering
					messageBlock.innerHTML = '';

					// DocumentFragment to render markdown off-DOM
					const fragment = document.createDocumentFragment();
					const tempContainer = document.createElement('div');
					fragment.appendChild(tempContainer);

					// Render the accumulated message to the temporary container
					await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);

					// Once rendering is complete, move the content to the actual message block
					while (tempContainer.firstChild) {
						messageBlock.appendChild(tempContainer.firstChild);
					}

					addParagraphBreaks(messageBlock);
					updateUnresolvedInternalLinks(plugin, messageBlock);

					const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
					copyCodeBlocks.forEach((copyCodeBlock) => {
						copyCodeBlock.textContent = 'Copy';
						setIcon(copyCodeBlock, 'copy');
					});
				}

				messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
					// If the user scrolls up or down, stop auto-scrolling
					if (event.deltaY < 0 || event.deltaY > 0) {
						isScroll = true;
					}
				});

				if (!isScroll) {
					targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
				}
			}

			if (abortController.signal.aborted) {
				new Notice('Stream stopped.');
				break;
			}
		}

		// Define regex patterns for the unwanted tags and their content
		const regexPatterns = [
			/<block-rendered>[\s\S]*?<\/block-rendered>/g,
			/<note-rendered>[\s\S]*?<\/note-rendered>/g
		];

		// Clean the message content by removing the unwanted tags and their content
		regexPatterns.forEach(pattern => {
			message = message.replace(pattern, '').trim();
		});

		addMessage(plugin, message.trim(), 'botMessage', settings, index);

	} catch (error) {
		if (error.name === 'AbortError') {
			// Request was aborted
			if (messageContainerEl) {
				const targetUserMessage = messageContainerElDivs[index];
				const targetBotMessage = targetUserMessage.nextElementSibling;

				const messageBlock = targetBotMessage?.querySelector('.messageBlock');
				const loadingEl = targetBotMessage?.querySelector('#loading');

				if (messageBlock && loadingEl) {
					targetBotMessage?.removeChild(loadingEl);
					messageBlock.textContent = 'SYSTEM: Response aborted.';
				}
			}
		} else {
			// Handle other errors
			const targetUserMessage = messageContainerElDivs[index];
			const targetBotMessage = targetUserMessage.nextElementSibling;
			targetBotMessage?.remove();

			const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
			const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
			messageContainer.appendChild(botMessageDiv);
		}

		if (message.trim() === '') {
			addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
		} else {
			addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
		}
		new Notice('Stream stopped.');
		console.error('Error fetching chat response from OpenAI-Based Models:', error);
	} finally {
		// Reset the abort controller
		abortController = null;
	}

	// Change the submit button back to a send button
	submitButton.textContent = 'send';
	setIcon(submitButton, 'arrow-up');
	submitButton.title = 'send';
}


export async function fetchAzureOpenAIResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
	abortController = new AbortController();

	const prompt = await getPrompt(plugin, settings);

	const filteredMessageHistory = filterMessageHistory(messageHistory);
	const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

	const messageContainerEl = document.querySelector('#messageContainer');
	const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

	const botMessageDiv = displayLoadingBotMessage(settings);

	messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
	botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

	await getActiveFileContent(plugin, settings);
	const referenceCurrentNoteContent = getCurrentNoteContent();

	const submitButton = document.querySelector('.submit-button') as HTMLElement;

	// Change button text to "Cancel"
	setIcon(submitButton, 'square');
	submitButton.title = 'stop';

	submitButton.addEventListener('click', async () => {
		if (submitButton.title === 'stop') {
			const controller = getAbortController();
			if (controller) {
				controller.abort();
			}
		}
	});

	try {
		const {azureOpenAIBaseUrl, deploymentName, APIKey} = plugin.settings.APIConnections.azureOpenAI
		const response = await fetch(`${azureOpenAIBaseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"api-key": APIKey
			},
			body: JSON.stringify({
				max_tokens: parseInt(settings.general.max_tokens),
				stream: false,
				messages: [
					{
						role: "system",
						content: settings.general.system_role + prompt + referenceCurrentNoteContent
					},
					...messageHistoryAtIndex
				]
			}),
			signal: abortController.signal
		});


		const data = await response.json();
		let message = data.choices[0].message.content || '';

		if (messageContainerEl) {
			const targetUserMessage = messageContainerElDivs[index];
			const targetBotMessage = targetUserMessage.nextElementSibling;

			const messageBlock = targetBotMessage?.querySelector('.messageBlock');
			const loadingEl = targetBotMessage?.querySelector('#loading');

			if (messageBlock) {
				if (loadingEl) {
					targetBotMessage?.removeChild(loadingEl);
				}

				await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);

				addParagraphBreaks(messageBlock);
				updateUnresolvedInternalLinks(plugin, messageBlock);

				const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
				copyCodeBlocks.forEach((copyCodeBlock) => {
					copyCodeBlock.textContent = 'Copy';
					setIcon(copyCodeBlock, 'copy');
				});

				targetBotMessage?.appendChild(messageBlock);
			}
			targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}

		if (message != null) {
			// Define regex patterns for the unwanted tags and their content
			const regexPatterns = [
				/<block-rendered>[\s\S]*?<\/block-rendered>/g,
				/<note-rendered>[\s\S]*?<\/note-rendered>/g,
				/<note-rendered>[\s\S]*?<\/note-rendered>/g
			];

			// Clean the message content by removing the unwanted tags and their content
			regexPatterns.forEach(pattern => {
				message = message.replace(pattern, '').trim();
			});
			addMessage(plugin, message.trim(), 'botMessage', settings, index);
		}
	} catch(error) {
		if (error.name === 'AbortError') {
			// Request was aborted, handle accordingly
			console.log('Request aborted');
			setIcon(submitButton, 'arrow-up');
			submitButton.title = 'send';

			// Request was aborted
			if (messageContainerEl) {
				const targetUserMessage = messageContainerElDivs[index];
				const targetBotMessage = targetUserMessage.nextElementSibling;

				const messageBlock = targetBotMessage?.querySelector('.messageBlock');
				const loadingEl = targetBotMessage?.querySelector('#loading');

				if (messageBlock && loadingEl) {
					targetBotMessage?.removeChild(loadingEl);
					messageBlock.textContent = 'SYSTEM: Response aborted.';
					addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
				}
			}
		} else {
			// Handle other errors
			const targetUserMessage = messageContainerElDivs[index];
			const targetBotMessage = targetUserMessage.nextElementSibling;
			targetBotMessage?.remove();

			const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
			const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
			messageContainer.appendChild(botMessageDiv);
		}
	} finally {
		// Reset the abort controller
		abortController = null;
	}
}

// Fetch OpenAI-Based API Stream
export async function fetchOpenAIAPIResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    abortController = new AbortController();

    const prompt = await getPrompt(plugin, settings);

    let message = '';
    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const targetUserMessage = messageContainerElDivs[index];
    const targetBotMessage = targetUserMessage.nextElementSibling;

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(`${plugin.settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${plugin.settings.APIConnections.openAI.APIKey}`,
            },
            body: JSON.stringify({
              model: settings.general.model,
              max_tokens: parseInt(settings.general.max_tokens),
              stream: true,
              messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex,
              ],
            }),
            signal: abortController.signal,
        });


        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
}

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: true }) || '';
            const parts = chunk.split('\n');


            for (const part of parts) {
                if (part.includes('data: [DONE]')) {
                    reading = false;
                    break;
                }
    
                try {
                    const trimmedPart = part.replace(/^data: /, '').trim();
                    if (trimmedPart) {
                        const data = JSON.parse(trimmedPart);
                        if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                            const content = data.choices[0].delta.content;
                            message += content;
                        }
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    console.log('Part with error:', part);
                }
            }

            if (messageContainerEl) {
                
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
        
            if (abortController.signal.aborted) {
                new Notice('Stream stopped.');
                break;
            }
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });
        
        addMessage(plugin, message.trim(), 'botMessage', settings, index);

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from OpenAI-Based Models:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from OpenRouter
export async function fetchOpenRouterResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    abortController = new AbortController();
    const prompt = await getPrompt(plugin, settings);  
    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });
 
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
            signal: abortController.signal
        });
        
        const data = await response.json();
        let message = data.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                    addMessage(plugin, 'SYSTEM: Response aborted.', 'botMessage', settings, index);
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

// Fetch response from openai-based rest api url (stream)
export async function fetchOpenRouterResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    abortController = new AbortController();

    const prompt = await getPrompt(plugin, settings);

    let message = '';

    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })
        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    messageBlock.innerHTML = '';
        
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });
        
        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(plugin, message.trim(), 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice('Stream stopped.');
        console.error(error);
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Abort controller
export function getAbortController() {
    return abortController;
}

function ollamaParametersOptions(settings: BMOSettings) {
    return {
        mirostat: parseInt(settings.OllamaConnection.ollamaParameters.mirostat),
        mirostat_eta: parseFloat(settings.OllamaConnection.ollamaParameters.mirostat_eta),
        mirostat_tau: parseFloat(settings.OllamaConnection.ollamaParameters.mirostat_tau),
        num_ctx: parseInt(settings.OllamaConnection.ollamaParameters.num_ctx),
        num_gqa: parseInt(settings.OllamaConnection.ollamaParameters.num_gqa),
        num_thread: parseInt(settings.OllamaConnection.ollamaParameters.num_thread),
        repeat_last_n: parseInt(settings.OllamaConnection.ollamaParameters.repeat_last_n),
        repeat_penalty: parseFloat(settings.OllamaConnection.ollamaParameters.repeat_penalty),
        temperature: parseInt(settings.general.temperature),
        seed: parseInt(settings.OllamaConnection.ollamaParameters.seed),
        stop: settings.OllamaConnection.ollamaParameters.stop,
        tfs_z: parseFloat(settings.OllamaConnection.ollamaParameters.tfs_z),
        num_predict: parseInt(settings.general.max_tokens) || -1,
        top_k: parseInt(settings.OllamaConnection.ollamaParameters.top_k),
        top_p: parseFloat(settings.OllamaConnection.ollamaParameters.top_p),
        min_p: parseFloat(settings.OllamaConnection.ollamaParameters.min_p),
    };
}

function filterMessageHistory(messageHistory: { role: string; content: string; images?: Uint8Array[] | string[] }[]) {
    const skipIndexes = new Set(); // Store indexes of messages to skip

    messageHistory.forEach((message, index,  array) => {
        // Check for user message with slash
        if (message.role === 'user' && message.content.startsWith('/')) {
            skipIndexes.add(index); // Skip this message
            // Check if next message is from the assistant and skip it as well
            if (index + 1 < array.length && array[index + 1].role === 'assistant') {
                skipIndexes.add(index + 1);
            }
        }
        // Check for assistant message with displayErrorBotMessage
        else if (message.role === 'assistant' && message.content.includes('errorBotMessage')) {
            skipIndexes.add(index); // Skip this message
            if (index > 0) {
                skipIndexes.add(index - 1); // Also skip previous message if it exists
            }
        }
    });

    // Filter the message history, skipping marked messages
    const filteredMessageHistory = messageHistory.filter((_, index) => !skipIndexes.has(index));

    // console.log('Filtered message history:', filteredMessageHistory);

    return filteredMessageHistory;
}

function removeConsecutiveUserRoles(messageHistory: { role: string; content: string; }[]) {
    const result = [];
    let foundUserMessage = false;

    for (let i = 0; i < messageHistory.length; i++) {
        if (messageHistory[i].role === 'user') {
            if (!foundUserMessage) {
                // First user message, add to result
                result.push(messageHistory[i]);
                foundUserMessage = true;
            } else {
                // Second consecutive user message found, stop adding to result
                break;
            }
        } else {
            // Non-user message, add to result
            result.push(messageHistory[i]);
            foundUserMessage = false;
        }
    }
    return result;
}
