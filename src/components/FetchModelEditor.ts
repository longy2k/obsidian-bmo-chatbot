import { requestUrl } from "obsidian";
import OpenAI from "openai";
import { BMOSettings } from "src/main";

// Fetch OpenAI API
export async function fetchOpenAIAPIEditor(settings: BMOSettings, selectionString: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    console.log(settings.system_role_prompt_select_generate);

    const completion = await openai.chat.completions.create({
        model: settings.model,
        max_tokens: parseInt(settings.max_tokens),
        messages: [
            { role: 'system', content:  settings.system_role_prompt_select_generate},
            { role: 'user', content: selectionString}
        ],
    });

    const message = completion.choices[0].message.content;
    return message;
}

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIEditor(settings: BMOSettings, selectionString: string) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const completion = await openai.chat.completions.create({
        model: settings.model,
        max_tokens: parseInt(settings.max_tokens),
        messages: [
            { role: 'system', content: settings.system_role_prompt_select_generate },
            { role: 'user', content: selectionString}
        ],
    });


    const message = completion.choices[0].message.content;
    return message;
}

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function ollamaFetchDataEditor(settings: BMOSettings, selectionString: string) {
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
                    { role: 'system', content: settings.system_role_prompt_select_generate },
                    { role: 'user', content: selectionString}
                ],
                stream: false,
                options: {
                    temperature: settings.temperature,
                    num_predict: parseInt(settings.max_tokens),
                },
            }),
        });

        const message = response.json.message.content;

        return message;

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Request response from openai-based rest api url (editor)
export async function openAIRestAPIFetchDataEditor(settings: BMOSettings, selectionString: string) {

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
                        { role: 'system', content: settings.system_role_prompt_select_generate },
                        { role: 'user', content: selectionString}
                    ],
                    max_tokens: parseInt(settings.max_tokens),
                    temperature: settings.temperature,
                }),
            });

            const message = response.json.choices[0].message.content;
            return message;

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

// Request response from Anthropic Editor
export async function requestUrlAnthropicAPIEditor(settings: BMOSettings, selectionString: string) {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
    };

    const requestBody = {
        model: settings.model,
        prompt:  `\n\nHuman: ${settings.system_role_prompt_select_generate}\n\n${selectionString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(settings.max_tokens) || 100000,
        temperature: settings.temperature,
        stream: false,
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
        console.error('Error making API request:', error);
        throw error;
    }
}