import { requestUrl } from 'obsidian';
import { BMOSettings } from 'src/main';
import OpenAI from 'openai';

// Request response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    // Extract image links from the input
    const imageMatch = prompt.match(/!?\[\[(.*?)\]\]/g);
    const imageLink = imageMatch 
    ? imageMatch
        .map(item => item.startsWith('!') ? item.slice(3, -2) : item.slice(2, -2))
        .filter(link => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|svg)$/i.test(link))
    : [];

    // // Initialize an array to hold the absolute URLs
    const imagesVaultPath: Uint8Array[] | string[] | null = [];

    // Loop through each image link to get the full path
    if (imageLink.length > 0) {
        imageLink.forEach(link => {
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(link, '');
            const image = imageFile ? this.app.vault.adapter.getFullPath(imageFile.path) : null;
            if (image) {
                imagesVaultPath.push(image);
            }
        });
    }

    try {
        const response = await fetch(ollamaRESTAPIURL + '/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                system: settings.editor.prompt_select_generate_system_role,
                prompt: prompt,
                images: imagesVaultPath,
                stream: false,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: {
                    temperature: temperature ? parseInt(temperature) : parseInt(settings.general.temperature),
                    num_predict: maxTokens ? parseInt(maxTokens) : parseInt(settings.general.max_tokens),
                },
            }),
            signal: signal,
        });
        const data = await response.json();
        const message = data.response.trim();

        return message;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request aborted');
        } else {
            console.error('Ollama request:', error);
            throw error;
        }
    }
}

// Request response from openai-based rest api url (editor)
export async function fetchRESTAPIURLDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await fetch(settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.prompt_select_generate_system_role || 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens || '-1'),
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const message = data.choices[0].message.content.trim();
        return message;

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}

// Fetch Anthropic API Editor
export async function fetchAnthropicResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
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
                model: model || settings.general.model,
                system: settings.editor.prompt_select_generate_system_role,
                messages: [
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                temperature: parseInt(temperature || settings.general.temperature),
            }),
        });

        const message = response.json.content[0].text.trim();
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch Google Gemini API Editor
export async function fetchGoogleGeminiDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    console.log(prompt);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.APIConnections.googleGemini.APIKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: settings.editor.prompt_select_generate_system_role + prompt }
                        ]
                    }
                ],
                model: model || settings.general.model,
                generationConfig: {
                    temperature: parseFloat(temperature || settings.general.temperature),
                    maxOutputTokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                }
            }),
            signal: signal,
        });

        const data = await response.json();
        const message = data.candidates[0].content.parts[0].text.trim();
        return message;
    } catch (error) {
        console.error(error);
    }
}

// Fetch Mistral API Editor
export async function fetchMistralDataEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: 'https://api.mistral.ai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.prompt_select_generate_system_role },
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseInt(temperature || settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content.trim();
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIResponseEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    const openai = new OpenAI({
        apiKey: settings.APIConnections.openAI.APIKey,
        baseURL: settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const completion = await openai.chat.completions.create({
        model: model ||settings.general.model,
        max_tokens: parseInt(maxTokens || settings.general.max_tokens),
        temperature: parseInt(temperature || settings.general.temperature),
        messages: [
            { role: 'system', content: settings.editor.prompt_select_generate_system_role },
            { role: 'user', content: prompt}
        ],
    });


    const message = completion.choices[0].message.content?.trim();
    return message;
}

// Request response from openai-based rest api url (editor)
export async function fetchOpenRouterEditor(settings: BMOSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.prompt_select_generate_system_role },
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseInt(temperature || settings.general.temperature),
            }),
        });

        const message = response.json.choices[0].message.content.trim();
        return message;

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}