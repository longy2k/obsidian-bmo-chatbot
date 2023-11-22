import { Notice, requestUrl } from "obsidian";
import { BMOSettings } from "./main";
import { OPENAI_MODELS, addMessage, addParagraphBreaks, codeBlockCopyButton, messageHistory, messageHistoryContent, prismHighlighting } from "./view";
import { marked } from "marked";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";

let abortController = new AbortController();

export async function fetchOpenAIAPI(settings: BMOSettings, referenceCurrentNote: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    abortController = new AbortController();

    try {
        const stream = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(settings.max_tokens),
            temperature: settings.temperature,
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role },
                ...messageHistoryContent as ChatCompletionMessageParam[]
            ],
            stream: true,
        });

        let message = '';

        for await (const part of stream) {

            const content = part.choices[0]?.delta?.content || '';

            message += content;

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];
                const messageBlock = lastBotMessage.querySelector('.messageBlock');
                const loadingEl = lastBotMessage.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        lastBotMessage.removeChild(loadingEl);
                    }

                    messageBlock.innerHTML = marked(message);

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
                }

            }
            
            if (abortController.signal.aborted) {
                new Notice('Error making API request: The user aborted a request.');
                break;
            }
        }

        addMessage(message, 'botMessage', settings);
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];

            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {
                messageBlock.innerHTML = marked(error.response?.data?.error || error.message);
                addMessage(messageBlock.innerHTML, 'botMessage', settings);
            }
        }
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Fetch Ollama API
export async function ollamaFetchData(settings: BMOSettings, referenceCurrentNoteContent: string) {
    const ollamaRestAPIUrl = settings.ollamaRestAPIUrl;

    if (!ollamaRestAPIUrl) {
        return;
    }

    const url = ollamaRestAPIUrl + '/api/generate';

    const messageHistoryAsString = messageHistory.map(item => `${item.role}: ${item.content}`).join('\n');

    abortController = new AbortController();

    let message = '';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: referenceCurrentNoteContent + '\n\n' + messageHistoryAsString + '\n\n' + 'YOUR RESPONSE:' + '\n\n'+ 'SYSTEM' + settings.system_role,
                model: settings.model,
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

            const chunk = decoder.decode(value, { stream: true }) || '';
            const parsedChunk = JSON.parse(chunk);

            const content = parsedChunk.response;

            message += content;

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];
                const messageBlock = lastBotMessage.querySelector('.messageBlock');
                const loadingEl = lastBotMessage.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        lastBotMessage.removeChild(loadingEl);
                    }

                    messageBlock.innerHTML = marked(message);

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
                }
            }
            message = message.replace(/assistant:/gi, '');
        }

        addMessage(message, 'botMessage', settings);

    } catch (error) {
        addMessage(message, 'botMessage', settings);
        console.error('Error making API request:', error);
        throw error;
    }
}

// Request response from Anthropic 
export async function requestUrlAnthropicAPI(
    url: string,
    settings: BMOSettings,
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string,
    temperature: number) 
    {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
    };
  
    const messageHistoryString = messageHistoryContent.map(entry => entry.content).join('\n');

    const requestBody = {
        model: settings.model,
        prompt:  `\n\nHuman: ${referenceCurrentNote}\n\n${settings.system_role}\n\n${messageHistoryString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(maxTokens) || 100000,
        temperature: temperature,
        stream: true,
    };
  
    try {
      const response = await requestUrl({
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
  
      return response;
  
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {

                messageBlock.innerHTML = 'Max tokens overflow. Please reduce max_tokens or clear chat messages. We recommend clearing max_tokens for best results.';
                addMessage(messageBlock.innerHTML, 'botMessage', settings);

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

// Request response from self-hosted models
export async function requestUrlChatCompletion(
    url: string, 
    settings: { apiKey: string; model: string; system_role: string; }, 
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string, 
    temperature: number)
    {
        const messageHistory = messageHistoryContent.map((item: { role: string; content: string; }) => ({
            role: item.role,
            content: item.content,
        }));

        try {
            const response = await requestUrl({
                url: url + '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: [
                        { role: 'system', content: referenceCurrentNote + settings.system_role },
                        ...messageHistory
                    ],
                    max_tokens: parseInt(maxTokens),
                    temperature: temperature,
                }),
            });

            return response;

        } catch (error) {
            console.error('Error making API request:', error);
            throw error;
        }
}

// Rename note title based on specified model
export async function fetchModelRenameTitle(settings: BMOSettings, referenceCurrentNoteContent: string) {

    const prompt = `Based on the following markdown content, create a new, suitable title.
     The title should not contain any of the following characters: backslashes, forward slashes, or colons.
     Also, please provide the title without using quotation marks - \n\n`;

    try {
        if (OPENAI_MODELS.includes(settings.model)) {

            const openai = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.openAIBaseUrl,
                dangerouslyAllowBrowser: true, // apiKey is stored within data.json
            });

            const chatCompletion = await openai.chat.completions.create({
                model: settings.model,
                messages: [
                    { role: 'system', content: prompt + referenceCurrentNoteContent},
                ],
            });

            let title = chatCompletion.choices[0].message.content;
            // Remove backslashes, forward slashes, and colons
            if (title) {
                title = title.replace(/[\\/:]/g, '');
            }

            return title;
        }
        else {
            if (settings.ollamaRestAPIUrl) {
                const url = settings.ollamaRestAPIUrl + '/api/generate';
    
                const requestBody = {
                    prompt: referenceCurrentNoteContent + '\n\n' + prompt  + ' OUTPUT TITLE ONLY:',
                    model: settings.model,
                    stream: false,
                    options: {
                        temperature: settings.temperature,
                        num_predict: 25,
                    },
                };
        
                const response = await requestUrl({
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
    
                const parseText = JSON.parse(response.text);
                let title = parseText.response;
    
                // Remove backslashes, forward slashes, and colons
                if (title) {
                    title = title.replace(/[\\/:]/g, '');
                }
    
                return title;
            }
        }
    } catch (error) {
        console.log("ERROR");
        throw new Error(error.response?.data?.error || error.message);
    }
}

export function getAbortController() {
    return abortController;
}