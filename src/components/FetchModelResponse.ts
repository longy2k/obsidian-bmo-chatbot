import { Notice, requestUrl } from 'obsidian';
import { BMOSettings } from '../main';
import { messageHistory } from '../view';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { marked } from 'marked';
import { prismHighlighting } from 'src/components/PrismaHighlighting';
import { addMessage, addParagraphBreaks } from './chat/Message';
import { codeBlockCopyButton } from './chat/Buttons';
import { getPrompt } from './chat/Prompt';
import { displayLoadingBotMessage } from './chat/BotMessage';
import { getActiveFileContent, getCurrentNoteContent } from './editor/ReferenceCurrentNote';

let abortController = new AbortController();

// Fetch OpenAI-Based API
export async function fetchOpenAIAPIData(settings: BMOSettings, index: number) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);
    
    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    try {
        const completion = await openai.chat.completions.create({
            model: settings.general.model,
            max_tokens: parseInt(settings.general.max_tokens),
            stream: false,
            messages: [
                { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
                ...messageHistoryAtIndex as ChatCompletionMessageParam[]
            ],
        });

        const message = completion.choices[0].message.content;
        
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');

            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                messageBlock.innerHTML = marked(message || '', { breaks: true });

                addParagraphBreaks(messageBlock);
                prismHighlighting(messageBlock);
                codeBlockCopyButton(messageBlock);
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (message != null) {
            addMessage(message, 'botMessage', settings, index);
        }

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Fetch OpenAI-Based API Chat
export async function fetchOpenAIAPIDataStream(settings: BMOSettings, index: number) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    abortController = new AbortController();

    let message = '';
    let isScroll = false;

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    try {
        const stream = await openai.chat.completions.create({
            model: settings.general.model,
            max_tokens: parseInt(settings.general.max_tokens),
            temperature: parseInt(settings.general.temperature),
            messages: [
                { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
                ...messageHistoryAtIndex as ChatCompletionMessageParam[]
            ],
            stream: true,
        });

        const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
        const targetBotMessage = targetUserMessage.nextElementSibling;

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

                    messageBlock.innerHTML = marked(message);

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
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
        addMessage(message, 'botMessage', settings, index);

    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll('.botMessage');
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');
            if (messageBlock) {
                messageBlock.innerHTML = marked(error.response?.data?.error || error.message);
                addMessage(messageBlock.innerHTML, 'botMessage', settings, index);
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
                const loadingEl = targetBotMessage?.querySelector('#loading');
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }
            }
        }
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaData(settings: BMOSettings, index: number) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
                    ...messageHistoryAtIndex
                ],
                stream: false,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: ollamaParametersOptions(settings),
            }),
        });

        const message = response.json.message.content;

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
                messageBlock.innerHTML = marked(message, { breaks: true });
                
                addParagraphBreaks(messageBlock);
                prismHighlighting(messageBlock);
                codeBlockCopyButton(messageBlock);
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(message, 'botMessage', settings, index);

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Fetch Ollama API via stream
export async function fetchOllamaDataStream(settings: BMOSettings, index: number) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    const url = ollamaRESTAPIURL + '/api/chat';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
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
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }

                    messageBlock.innerHTML = marked(message, { breaks: true });

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);

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
        addMessage(message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(message, 'botMessage', settings, index); // This will save mid-stream conversation.
        console.error('Error making API request:', error);
        throw error;
    }
}

// Request response from openai-based rest api url
export async function fetchRESTAPIURLData(settings: BMOSettings, index: number) {
    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();
    
    const urls = [
        settings.RESTAPIURLConnection.RESTAPIURL + '/v1/chat/completions',
        settings.RESTAPIURLConnection.RESTAPIURL + '/api/v1/chat/completions'
    ];

    let lastError = null;

    for (const url of urls) {
        try {
            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
                },
                body: JSON.stringify({
                    model: settings.general.model,
                    messages: [
                        { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
                        ...messageHistoryAtIndex
                    ],
                    max_tokens: parseInt(settings.general.max_tokens) || 4096,
                    temperature: parseInt(settings.general.temperature),
                }),
            });

            const message = response.json.choices[0].message.content;

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');
            
                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
                    messageBlock.innerHTML = marked(message, { breaks: true });
                    
                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
                    
                    targetBotMessage?.appendChild(messageBlock);
                }
                targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
            }

            addMessage(message, 'botMessage', settings, index);
            return;

        } catch (error) {
            lastError = error; // Store the last error and continue
        }
    }

    // If all requests failed, throw the last encountered error
    if (lastError) {
        console.error('Error making API request:', lastError);
        throw lastError;
    }
}

// Fetch REST API via stream
export async function fetchRESTAPIURLDataStream(settings: BMOSettings, index: number) {
    const RESTAPIURL = settings.RESTAPIURLConnection.RESTAPIURL;

    if (!RESTAPIURL) {
        return;
    }

    const url = RESTAPIURL + '/v1/chat/completions';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
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

            // Check if chunk contains 'data: [DONE]'
            if (chunk.includes('data: [DONE]')) {
                break;
            }
            
            const trimmedChunk = chunk.replace(/^data: /, '');
            
            // Splitting the chunk to parse JSON messages separately
            const parts = trimmedChunk.split('\n');

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part);
                    if ((parsedChunk.done !== true) || part !== 'data: [DONE]') {
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
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }

                    messageBlock.innerHTML = marked(message, { breaks: true });

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);

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
        addMessage(message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(message, 'botMessage', settings, index); // This will save mid-stream conversation.
        console.error('Error making API request:', error);
        throw error;
    }
}

// Request response from Mistral
export async function fetchMistralData(settings: BMOSettings, index: number) {
    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }
                messageBlock.innerHTML = marked(message, { breaks: true });
                
                addParagraphBreaks(messageBlock);
                prismHighlighting(messageBlock);
                codeBlockCopyButton(messageBlock);
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(message, 'botMessage', settings, index);
        return;

    } catch (error) {
        console.error(error);
    }

}

// Fetch Mistral API via stream
export async function fetchMistralDataStream(settings: BMOSettings, index: number) {
    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt},
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

            // console.log("chunk",chunk);
            
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
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }

                    messageBlock.innerHTML = marked(message, { breaks: true });

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);

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
        addMessage(message, 'botMessage', settings, index);
        
    } catch (error) {
        addMessage(message, 'botMessage', settings, index); // This will save mid-stream conversation.
        console.error('Error making API request:', error);
        throw error;
    }
}

export async function fetchGoogleGeminiData(settings: BMOSettings, index: number) {
    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    // Function to convert messageHistory to Google Gemini format
    const convertMessageHistory = (messageHistory: { role: string; content: string }[], referenceCurrentNoteContent: string) => {
        // Clone the messageHistory to avoid mutating the original array
        const modifiedMessageHistory = [...messageHistory];
        
        // Find the last user message index
        const lastUserMessageIndex = modifiedMessageHistory.map((message, index) => ({ role: message.role, index }))
                                                    .filter(message => message.role === 'user')
                                                    .map(message => message.index)
                                                    .pop();

        // Append referenceCurrentNoteContent to the last user message, if found
        if (lastUserMessageIndex !== undefined) {
            modifiedMessageHistory[lastUserMessageIndex].content += '\n\n' + referenceCurrentNoteContent + '\n\n' + settings.general.system_role + '\n\n' + prompt;
        }

        const contents = modifiedMessageHistory.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : role, // Convert "assistant" to "model"
            parts: [{ text: content }]
        }));

        return { contents };
    };
    
    // Use the function to convert your message history
    const convertedMessageHistory = convertMessageHistory(messageHistoryAtIndex, referenceCurrentNoteContent);

    try {        
        // Assuming settings.APIConnections.googleGemini.APIKey contains your API key
        const API_KEY = settings.APIConnections.googleGemini.APIKey;
        
        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
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
            const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }
                messageBlock.innerHTML = marked(message, { breaks: true });
                
                addParagraphBreaks(messageBlock);
                prismHighlighting(messageBlock);
                codeBlockCopyButton(messageBlock);
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        addMessage(message, 'botMessage', settings, index);
        return;

    } catch (error) {
        console.error(error);
    }

}

// Request response from Anthropic 
export async function fetchAnthropicAPIData(settings: BMOSettings, index: number) {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.APIConnections.anthropic.APIKey,
    };
  
    let prompt = await getPrompt(settings);

    if (prompt == undefined) {
        prompt = '';
    }

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageHistoryAtIndexString = messageHistoryAtIndex.map(entry => entry.content).join('\n');
            
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const requestBody = {
        model: settings.general.model,
        prompt:  `\n\nHuman: ${referenceCurrentNoteContent}\n\n${settings.general.system_role}\n\n${prompt}\n\n${messageHistoryAtIndexString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(settings.general.max_tokens) || 100000,
        temperature: parseInt(settings.general.temperature),
        stream: true,
    };
  
    try {
      const response = await requestUrl({
        url: 'https://api.anthropic.com/v1/complete',
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
  
      const message = response.text;
      const lines = message.split('\n');
      let completionText = '';
  
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const eventData = JSON.parse(line.slice('data:'.length));
          if (eventData.completion) {
            completionText += eventData.completion;
          }
        }
      }

      const messageContainerEl = document.querySelector('#messageContainer');
      if (messageContainerEl) {
        const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
        const targetBotMessage = targetUserMessage.nextElementSibling;

        const messageBlock = targetBotMessage?.querySelector('.messageBlock');
        const loadingEl = targetBotMessage?.querySelector('#loading');

          if (messageBlock) {
            if (loadingEl) {
                targetBotMessage?.removeChild(loadingEl);
            }
            messageBlock.innerHTML = marked(completionText);
          
            addParagraphBreaks(messageBlock);
            prismHighlighting(messageBlock);
            codeBlockCopyButton(messageBlock);
          }
          targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      addMessage('\n\nAssistant: ' + completionText, 'botMessage', settings, index);
  
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll('.botMessage');
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {

                messageBlock.innerHTML = 'Max tokens overflow. Please reduce max_tokens or clear chat messages. We recommend clearing max_tokens for best results.';
                addMessage(messageBlock.innerHTML, 'botMessage', settings, index);

                const loadingEl = lastBotMessage.querySelector('#loading');
                if (loadingEl) {
                    loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    lastBotMessage.removeChild(loadingEl);
                }
            }
        }
      console.error('Error making API request:', error);
      throw error;
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
    const filteredMessageHistory = messageHistory.filter((message, index, array) => {
        const isUserMessageWithSlash = (message.role === 'user' && message.content.includes('/')) || 
                                        (array[index - 1]?.role === 'user' && array[index - 1]?.content.includes('/'));

        return !isUserMessageWithSlash;
    });

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