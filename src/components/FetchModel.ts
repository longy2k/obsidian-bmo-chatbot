import { Notice, requestUrl } from "obsidian";
import { BMOSettings } from "../main";
import { ANTHROPIC_MODELS, OPENAI_MODELS, addMessage, addParagraphBreaks, codeBlockCopyButton, messageHistory, prismHighlighting } from "../view";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { marked } from "marked";

let abortController = new AbortController();

// Fetch OpenAI API
export async function fetchOpenAIAPI(settings: BMOSettings, referenceCurrentNote: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    // Removes all system commands from the message history
    const filteredMessageHistoryContent = messageHistory.filter((message, index, array) => {
        const isUserMessageWithSlash = (message.role === 'user' && message.content.includes('/')) || 
                                        (array[index - 1]?.role === 'user' && array[index - 1]?.content.includes('/'));

        return !isUserMessageWithSlash;
    });

    try {
        const stream = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(settings.max_tokens),
            temperature: settings.temperature,
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role },
                ...filteredMessageHistoryContent as ChatCompletionMessageParam[]
            ],
            stream: true,
        });

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


                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    lastBotMessage.scrollIntoView({ behavior: 'auto', block: 'start' });
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

// Fetch OpenAI API
export async function fetchOpenAIBaseAPI(settings: BMOSettings, referenceCurrentNote: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    // Removes all system commands from the message history
    const filteredMessageHistoryContent = messageHistory.filter((message, index, array) => {
        const isUserMessageWithSlash = (message.role === 'user' && message.content.includes('/')) || 
                                        (array[index - 1]?.role === 'user' && array[index - 1]?.content.includes('/'));

        return !isUserMessageWithSlash;
    });

    try {
        const completion = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(settings.max_tokens),
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role },
                ...filteredMessageHistoryContent as ChatCompletionMessageParam[]
            ],
        });

        const message = completion.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const loadingEl = lastBotMessage.querySelector("#loading");

            if (loadingEl) {
                loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                lastBotMessage.removeChild(loadingEl);
            }

            const messageBlock = document.createElement("p");
            const markdownContent = message ? marked(message) : '';
            messageBlock.innerHTML = markdownContent;
            messageBlock.classList.add("messageBlock");

            addParagraphBreaks(messageBlock);
            prismHighlighting(messageBlock);
            codeBlockCopyButton(messageBlock);
            
            lastBotMessage.appendChild(messageBlock);
            lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (message != null) {
            addMessage(message, 'botMessage', settings);
        }

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }

}

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function ollamaFetchData(settings: BMOSettings, referenceCurrentNoteContent: string){
    const ollamaRestAPIUrl = settings.ollamaRestAPIUrl;

    if (!ollamaRestAPIUrl) {
        return;
    }
    
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
                    { role: 'system', content: referenceCurrentNoteContent + settings.system_role },
                    ...messageHistory
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
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const loadingEl = lastBotMessage.querySelector("#loading");
            
            if (loadingEl) {
                loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                lastBotMessage.removeChild(loadingEl);
            }
        
            const messageBlock = document.createElement("p");
            const markdownContent = marked(message);
            messageBlock.innerHTML = markdownContent;
            messageBlock.classList.add("messageBlock");
            
            addParagraphBreaks(messageBlock);
            prismHighlighting(messageBlock);
            codeBlockCopyButton(messageBlock);
            
            lastBotMessage.appendChild(messageBlock);
            lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            const spacer = messageContainerEl.querySelector("#spacer");
            if (spacer) {
                spacer.remove();
            }
        }

        addMessage(message, 'botMessage', settings);

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Fetch Ollama API via stream
export async function ollamaFetchDataStream(settings: BMOSettings, referenceCurrentNoteContent: string) {
    const ollamaRestAPIUrl = settings.ollamaRestAPIUrl;

    if (!ollamaRestAPIUrl) {
        return;
    }

    const url = ollamaRestAPIUrl + '/api/chat';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    // Removes all system commands from the message history
    const filteredMessageHistoryContent = messageHistory.filter((message, index, array) => {
        // Check if the current message or the previous one is a user message containing '/'
        const isUserMessageWithSlash = (message.role === 'user' && message.content.includes('/')) || 
                                        (array[index - 1]?.role === 'user' && array[index - 1]?.content.includes('/'));
    
        // Include the message in the new array if it's not part of a pair to be removed
        return !isUserMessageWithSlash;
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.system_role },
                    ...filteredMessageHistoryContent
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
                const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];
                const messageBlock = lastBotMessage.querySelector('.messageBlock');
                const loadingEl = lastBotMessage.querySelector("#loading");

                if (messageBlock) {
                    if (loadingEl) {
                        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        lastBotMessage.removeChild(loadingEl);
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
                    lastBotMessage.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

        }
        addMessage(message, 'botMessage', settings);
        
    } catch (error) {
        addMessage(message, 'botMessage', settings); // This will save mid-stream conversation.
        console.error('Error making API request:', error);
        throw error;
    }
}

// Request response from Anthropic 
export async function requestUrlAnthropicAPI(settings: BMOSettings, referenceCurrentNoteContent: string) {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
    };
  
    const messageHistoryString = messageHistory.map(entry => entry.content).join('\n');

    const requestBody = {
        model: settings.model,
        prompt:  `\n\nHuman: ${referenceCurrentNoteContent}\n\n${settings.system_role}\n\n${messageHistoryString}\n\nAssistant:`,
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

// Request response from self-hosted models (LOCAL AI)
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
     Also, please provide the title without using quotation marks. THE TITLE IS: \n\n`;

    try {
        if (OPENAI_MODELS.includes(settings.model) || settings.openAIBaseModels.includes(settings.model)) {

            const openai = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.openAIBaseUrl,
                dangerouslyAllowBrowser: true, // apiKey is stored within data.json
            });

            const chatCompletion = await openai.chat.completions.create({
                model: settings.model,
                max_tokens: 40,
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
        else if(ANTHROPIC_MODELS.includes(settings.model)) {
            const headers = {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.apiKey,
              };
          
              const requestBody = {
                  model: settings.model,
                  prompt:  `\n\nHuman: ${prompt}\n\nAssistant:`,
                  max_tokens_to_sample: 40,
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
                let title = '';
            
                for (const line of lines) {
                  if (line.startsWith('data:')) {
                    const eventData = JSON.parse(line.slice('data:'.length));
                    if (eventData.completion) {
                      title += eventData.completion;
                    }
                  }
                }

                if (title) {
                    title = title.replace(/[\\/:]/g, '');
                }
            
                return title;
            
              } catch (error) {
                new Notice('Error making API request:', error);
                console.error('Error making API request:', error);
                throw error;
              }
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

// Abort controller
export function getAbortController() {
    return abortController;
}