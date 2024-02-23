import { requestUrl } from 'obsidian';
import OpenAI from 'openai';
import { BMOSettings } from 'src/main';

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIDataEditor(settings: BMOSettings, selectionString: string) {
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

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaDataEditor(settings: BMOSettings, selectionString: string) {
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
                    temperature: settings.general.temperature,
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
                        { role: 'system', content: settings.editor.system_role_prompt_select_generate },
                        { role: 'user', content: selectionString}
                    ],
                    max_tokens: parseInt(settings.general.max_tokens),
                    temperature: settings.general.temperature,
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
                temperature: settings.general.temperature,
            }),
        });

        const message = response.json.choices[0].message.content;
        return message;

    } catch (error) {
        console.error(error);
    }
}

export async function fetchGoogleGeminiDataEditor(settings: BMOSettings, selectionString: string) {
    try {        
        // Assuming settings.APIConnections.googleGemini.APIKey contains your API key
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
    
// Request response from Anthropic Editor
export async function fetchAnthropicAPIDataEditor(settings: BMOSettings, selectionString: string) {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.APIConnections.anthropic.APIKey,
    };

    const requestBody = {
        model: settings.general.model,
        prompt:  `\n\nHuman: ${settings.editor.system_role_prompt_select_generate}\n\n${selectionString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(settings.general.max_tokens) || 100000,
        temperature: settings.general.temperature,
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