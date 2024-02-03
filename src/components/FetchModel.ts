import { Notice, requestUrl } from "obsidian";
import { BMOSettings } from "../main";
import { messageHistory } from "../view";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { marked } from "marked";
import { prismHighlighting } from "src/components/PrismaHighlighting";
import { addMessage, addParagraphBreaks } from "./chat/Message";
import { codeBlockCopyButton } from "./chat/Buttons";
import { getPrompt } from "./chat/Prompt";
import { displayLoadingBotMessage } from "./chat/BotMessage";

let abortController = new AbortController();

// Fetch OpenAI API Chat
export async function fetchOpenAIAPI(settings: BMOSettings, referenceCurrentNoteContent: string, index: number) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    abortController = new AbortController();

    let message = '';
    let isScroll = false;

    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const stream = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(settings.max_tokens),
            temperature: settings.temperature,
            messages: [
                { role: 'system', content: referenceCurrentNoteContent + settings.system_role + prompt},
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
                const loadingEl = targetBotMessage?.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        clearInterval(loadingAnimationIntervalId);
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
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');
            if (messageBlock) {
                messageBlock.innerHTML = marked(error.response?.data?.error || error.message);
                addMessage(messageBlock.innerHTML, 'botMessage', settings, index);
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
                const loadingEl = targetBotMessage?.querySelector("#loading");
                if (loadingEl) {
                    clearInterval(loadingAnimationIntervalId);
                    targetBotMessage?.removeChild(loadingEl);
                }
            }
        }
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Fetch OpenAI-Based API
export async function fetchOpenAIBaseAPI(settings: BMOSettings, referenceCurrentNote: string, index: number) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const completion = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(settings.max_tokens),
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role + prompt},
                ...messageHistoryAtIndex as ChatCompletionMessageParam[]
            ],
        });

        const message = completion.choices[0].message.content;
        
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector("#loading");

            if (messageBlock) {
                if (loadingEl) {
                    clearInterval(loadingAnimationIntervalId);
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

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function ollamaFetchData(settings: BMOSettings, referenceCurrentNoteContent: string, index: number) {
    const ollamaRestAPIUrl = settings.ollamaRestAPIUrl;

    if (!ollamaRestAPIUrl) {
        return;
    }

    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        const response = await requestUrl({
            url: ollamaRestAPIUrl + '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.system_role + prompt},
                    ...messageHistoryAtIndex
                ],
                stream: false,
                options: {
                    temperature: settings.temperature,
                    num_predict: parseInt(settings.max_tokens),
                },
            }),
        });

        const message = response.json.message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector("#loading");
        
            if (messageBlock) {
                if (loadingEl) {
                    clearInterval(loadingAnimationIntervalId);
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
export async function ollamaFetchDataStream(settings: BMOSettings, referenceCurrentNoteContent: string, index: number) {
    const ollamaRestAPIUrl = settings.ollamaRestAPIUrl;

    if (!ollamaRestAPIUrl) {
        return;
    }

    const url = ollamaRestAPIUrl + '/api/chat';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.system_role + prompt},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                options: {
                    temperature: settings.temperature,
                    num_predict: parseInt(settings.max_tokens),
                },
            }),
            signal: abortController.signal
        })
        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice(`Response body is null or undefined.`);
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

            const chunk = decoder.decode(value, { stream: true }) || "";
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
                const loadingEl = targetBotMessage?.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        clearInterval(loadingAnimationIntervalId);
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
export async function openAIRestAPIFetchData(settings: BMOSettings, referenceCurrentNote: string, index: number) {
    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const urls = [
        settings.openAIRestAPIUrl + '/v1/chat/completions',
        settings.openAIRestAPIUrl + '/api/v1/chat/completions'
    ];

    let lastError = null;

    for (const url of urls) {
        try {
            const response = await requestUrl({
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: [
                        { role: 'system', content: referenceCurrentNote + settings.system_role + prompt},
                        ...messageHistoryAtIndex
                    ],
                    max_tokens: parseInt(settings.max_tokens),
                    temperature: settings.temperature,
                }),
            });

            const message = response.json.choices[0].message.content;


            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index ?? messageHistory.length - 1];
                const targetBotMessage = targetUserMessage.nextElementSibling;
    
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector("#loading");
            
                if (messageBlock) {
                    if (loadingEl) {
                        clearInterval(loadingAnimationIntervalId);
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

// Fetch Ollama API via stream
export async function openAIRestAPIFetchDataStream(settings: BMOSettings, referenceCurrentNoteContent: string, index: number) {
    const openAIRestAPIUrl = settings.openAIRestAPIUrl;

    if (!openAIRestAPIUrl) {
        return;
    }

    const url = openAIRestAPIUrl + '/v1/chat/completions';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.system_role + prompt},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                temperature: settings.temperature,
                max_tokens: parseInt(settings.max_tokens),
            }),
            signal: abortController.signal
        })

        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice(`Response body is null or undefined.`);
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

            const chunk = decoder.decode(value, { stream: false }) || "";

            // Check if chunk contains 'data: [DONE]'
            if (chunk.includes("data: [DONE]")) {
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
                const loadingEl = targetBotMessage?.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        clearInterval(loadingAnimationIntervalId);
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

// Request response from Anthropic 
export async function requestUrlAnthropicAPI(settings: BMOSettings, referenceCurrentNoteContent: string, index: number) {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
    };
  
    const prompt = await getPrompt(settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageHistoryAtIndexString = messageHistoryAtIndex.map(entry => entry.content).join('\n');
            
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    // Define a function to update the loading animation
    const updateLoadingAnimation = () => {
        const loadingEl = document.querySelector('#loading');
        if (!loadingEl) {
            return;
        }
        loadingEl.textContent += ".";
        // If the loading animation has reached three dots, reset it to one dot
        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
            loadingEl.textContent = ".";
        }
    }; 
    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const requestBody = {
        model: settings.model,
        prompt:  `\n\nHuman: ${referenceCurrentNoteContent}\n\n${settings.system_role}\n\n${prompt}\n\n${messageHistoryAtIndexString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(settings.max_tokens) || 100000,
        temperature: settings.temperature,
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
        const loadingEl = targetBotMessage?.querySelector("#loading");

          if (messageBlock) {
            if (loadingEl) {
                clearInterval(loadingAnimationIntervalId);
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
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {

                messageBlock.innerHTML = 'Max tokens overflow. Please reduce max_tokens or clear chat messages. We recommend clearing max_tokens for best results.';
                addMessage(messageBlock.innerHTML, 'botMessage', settings, index);

                const loadingEl = lastBotMessage.querySelector("#loading");
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