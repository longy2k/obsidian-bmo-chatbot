import { MarkdownRenderer, Notice, requestUrl, setIcon } from 'obsidian';
import BMOGPT, { BMOSettings } from '../main';
import { messageHistory } from '../view';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { addMessage, addParagraphBreaks } from './chat/Message';
import { displayErrorBotMessage, displayLoadingBotMessage } from './chat/BotMessage';
import { getActiveFileContent, getCurrentNoteContent } from './editor/ReferenceCurrentNote';
import OpenAI from 'openai';
import { getPrompt } from './chat/Prompt';

let abortController = new AbortController();

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

    try {
        const response = await requestUrl({
            url: ollamaRESTAPIURL + '/api/chat',
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
                stream: false,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: ollamaParametersOptions(settings),
            }),
        });

        const message = response.json.message.content;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
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
        addMessage(plugin, message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(plugin, message, 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice(error);
        console.error(error);
    }
}

// Fetch response from openai-based rest api url
export async function fetchRESTAPIURLResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
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

        const message = response.json.choices[0].message.content;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);
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

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

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
        addMessage(plugin, message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(plugin, message, 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice(error);
        console.error(error);
    }
}

// Fetch response from Anthropic
export async function fetchAnthropicResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {

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

        const message = response.json.content[0].text;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);
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

    try {        
        const API_KEY = settings.APIConnections.googleGemini.APIKey;
        
        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `System prompt: \n\n ${plugin.settings.general.system_role} ${prompt} ${referenceCurrentNoteContent} Respond understood if you got it.`}],
                    },
                    {
                        role: 'model',
                        parts: [{ text: 'Understood.'}],
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
        });
        
        const message = response.json.candidates[0].content.parts[0].text;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);
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

// Fetch response from Mistral
export async function fetchMistralResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
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

    try {
        const response = await requestUrl({
            url: 'https://api.mistral.ai/v1/chat/completions',
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
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);
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

// Fetch response Mistral (stream)
export async function fetchMistralResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
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
        addMessage(plugin, message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(plugin, message, 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice(error);
        console.error(error);
    }
}

// Fetch OpenAI-Based API
export async function fetchOpenAIAPIResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

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

    try {
        const completion = await openai.chat.completions.create({
            model: settings.general.model,
            max_tokens: parseInt(settings.general.max_tokens),
            stream: false,
            messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                ...messageHistoryAtIndex as ChatCompletionMessageParam[]
            ],
        });

        const message = completion.choices[0].message.content;
        
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
            addMessage(plugin, message, 'botMessage', settings, index);
        }

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}

// Fetch OpenAI-Based API Stream
export async function fetchOpenAIAPIResponseStream(plugin: BMOGPT, settings: BMOSettings, index: number) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

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

    try {
        const stream = await openai.chat.completions.create({
            model: settings.general.model,
            max_tokens: parseInt(settings.general.max_tokens),
            temperature: parseInt(settings.general.temperature),
            stream: true,
            messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                ...messageHistoryAtIndex as ChatCompletionMessageParam[]
            ],
        });

        for await (const part of stream) {

            const content = part.choices[0]?.delta?.content || '';

            message += content;

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
                new Notice('Error making API request: The user aborted a request.');
                break;
            }
        }
        addMessage(plugin, message, 'botMessage', settings, index);

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}

// Fetch response from OpenRouter
export async function fetchOpenRouterResponse(plugin: BMOGPT, settings: BMOSettings, index: number) {
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
 
    try {
        const response = await requestUrl({
            url: 'https://openrouter.ai/api/v1/chat/completions',
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
        });

        const message = response.json.choices[0].message.content;

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

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(plugin, message, 'botMessage', settings, index);
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
        addMessage(plugin, message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(plugin, message, 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice(error);
        console.error(error);
    }
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
    };
}

function filterMessageHistory(messageHistory: { role: string; content: string }[]) {
    const skipIndexes = new Set(); // Store indexes of messages to skip

    messageHistory.forEach((message, index, array) => {
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