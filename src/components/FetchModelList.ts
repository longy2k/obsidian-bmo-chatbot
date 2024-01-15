import { Notice, requestUrl } from "obsidian";
import OpenAI from "openai";
import BMOGPT from "src/main";

export async function fetchOpenAIBaseModels(plugin: BMOGPT) {
    const openai = new OpenAI({
        apiKey: plugin.settings.apiKey,
        baseURL: plugin.settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });
	const list = await openai.models.list();

	const models = list.data.map((model) => model.id);
	plugin.settings.openAIBaseModels = models;

	return models;
}

// Fetch OLLAMA models from OLLAMA REST API
export async function fetchOllamaModels(plugin: BMOGPT) {
	const ollamaRestAPIUrl = plugin.settings.ollamaRestAPIUrl;

    // URL Validation
    try {
        new URL(ollamaRestAPIUrl);
    } catch (error) {
        // console.error('Invalid OLLAMA URL:', ollamaRestAPIUrl);
        return;
    }

	try {
		const response = await requestUrl({
			url: ollamaRestAPIUrl + '/api/tags',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const jsonData = response.json;

		const models = jsonData.models.map((model: { name: string; }) => model.name);
		plugin.settings.ollamaModels = models;  


		return models;

	} catch (error) {
		console.error('Error:', error);
	}
}

export async function fetchOpenAIRestAPIModels(plugin: BMOGPT) {
    const openAIRestAPIUrl = plugin.settings.openAIRestAPIUrl;

    // URL Validation
    try {
        new URL(openAIRestAPIUrl);
    } catch (error) {
        // console.error('Invalid OpenAI Rest API URL:', openAIRestAPIUrl);
        return;
    }

    const urls = [
        openAIRestAPIUrl + '/v1/models',
        openAIRestAPIUrl + '/api/v1/models'
    ];

    let lastError = null;

    for (const url of urls) {
        try {
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${plugin.settings.apiKey}`
                },
            });

            // Check if the response is valid
            if (response.json && response.json.data) {
                const models = response.json.data.map((model: { id: number; }) => model.id);
                plugin.settings.openAIRestAPIModels = models;
                return models;
            }
        } catch (error) {
            lastError = error; // Store the last error and continue
        }
    }

    // If all requests failed, throw the last encountered error
    if (lastError) {
        console.error('Error making API request:', lastError);
        new Notice("OpenAI REST API URL connection error.");
        throw lastError;
    }
}

