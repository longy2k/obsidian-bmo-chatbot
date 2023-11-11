import { requestUrl } from "obsidian";
import { BMOSettings } from "./main";
import { addMessage, addParagraphBreaks, codeBlockCopyButton, prismHighlighting } from "./view";
import { marked } from "marked";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";

export async function fetchOpenAIAPI(
    settings: BMOSettings,
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string,
    temperature: number) 
    {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const messageHistory = messageHistoryContent.map(item => ({
        role: item.role,
        content: item.content,
    })) as ChatCompletionMessageParam[];

    try {
        const stream = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(maxTokens),
            temperature: temperature,
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role },
                ...messageHistory
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

                if (messageBlock) {
                    messageBlock.innerHTML = marked(message);

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
                }
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

export async function fetchOpenAIAPITitle(settings: BMOSettings, markdownContent: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const prompt = `Based on the following markdown content, create a new, suitable title.
     The title should not contain any of the following characters: backslashes, forward slashes, or colons.
     Also, please provide the title without using quotation marks:\n\n`;

    try {
        const chatCompletion = await openai.chat.completions.create({
            model: settings.model,
            messages: [
                { role: 'system', content: prompt + markdownContent},
            ],
        });

        let title = chatCompletion.choices[0].message.content;
        // Remove backslashes, forward slashes, and colons
        if (title) {
            title = title.replace(/[\\/:]/g, '');
        }

        return title;

    } catch (error) {
        console.log("ERROR");
        throw new Error(error.response?.data?.error || error.message);
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