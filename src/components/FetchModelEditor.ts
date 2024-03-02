import { requestUrl } from 'obsidian';
import { BMOSettings } from 'src/main';
import OpenAI from 'openai';

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaResponseEditor(settings: BMOSettings, selectionString: string) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

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
                    { role: 'system', content: settings.editor.system_role_prompt_select_generate },
                    { role: 'user', content: selectionString}
                ],
                stream: false,
                options: {
                    temperature: parseInt(settings.general.temperature),
                    num_predict: parseInt(settings.general.max_tokens),
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
export async function fetchRESTAPIURLDataEditor(settings: BMOSettings, selectionString: string) {
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
                    { role: 'system', content: settings.editor.system_role_prompt_select_generate },
                    { role: 'user', content: selectionString}
                ],
                max_tokens: parseInt(settings.general.max_tokens),
                temperature: parseInt(settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content;
        return message;

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Fetch Anthropic API Editor
export async function fetchAnthropicResponseEditor(settings: BMOSettings, selectionString: string) {
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
                system: settings.editor.system_role_prompt_select_generate,
                messages: [
                    { role: 'user', content: selectionString}
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        const message = response.json.content[0].text;
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch Google Gemini API Editor
export async function fetchGoogleGeminiDataEditor(settings: BMOSettings, selectionString: string) {
    try {        
        const API_KEY = settings.APIConnections.googleGemini.APIKey;

        const requestBody = {
            contents: [{
                parts: [
                    {text: settings.editor.system_role_prompt_select_generate + selectionString}
                ]
            }],
        }
        
        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        const message = response.json.candidates[0].content.parts[0].text;
        return message;
    } catch (error) {
        console.error(error);
    }

}

// Fetch Mistral API Editor
export async function fetchMistralDataEditor(settings: BMOSettings, selectionString: string) {
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
                    { role: 'system', content: settings.editor.system_role_prompt_select_generate },
                    { role: 'user', content: selectionString}
                ],
                max_tokens: parseInt(settings.general.max_tokens),
                temperature: parseInt(settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content;
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIResponseEditor(settings: BMOSettings, selectionString: string) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const completion = await openai.chat.completions.create({
        model: settings.general.model,
        max_tokens: parseInt(settings.general.max_tokens),
        messages: [
            { role: 'system', content: settings.editor.system_role_prompt_select_generate },
            { role: 'user', content: selectionString}
        ],
    });


    const message = completion.choices[0].message.content;
    return message;
}