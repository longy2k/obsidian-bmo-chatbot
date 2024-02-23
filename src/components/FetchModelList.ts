import { requestUrl } from 'obsidian';
import OpenAI from 'openai';
import BMOGPT from 'src/main';

export async function fetchOpenAIBaseModels(plugin: BMOGPT) {
    const openai = new OpenAI({
        apiKey: plugin.settings.APIConnections.openAI.APIKey,
        baseURL: plugin.settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

	const list = await openai.models.list();

	const models = list.data.map((model) => model.id);
	plugin.settings.APIConnections.openAI.openAIBaseModels = models;

	return models;
}

// Fetch OLLAMA models from OLLAMA REST API
export async function fetchOllamaModels(plugin: BMOGPT) {
	const ollamaRESTAPIURL = plugin.settings.OllamaConnection.RESTAPIURL;

    // URL Validation
    try {
        new URL(ollamaRESTAPIURL);
    } catch (error) {
        // console.error('Invalid OLLAMA URL:', ollamaRESTAPIURL);
        return;
    }

	try {
		const response = await requestUrl({
			url: ollamaRESTAPIURL + '/api/tags',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const jsonData = response.json;

		const models = jsonData.models.map((model: { name: string; }) => model.name);
		plugin.settings.OllamaConnection.ollamaModels = models;  


		return models;

	} catch (error) {
		console.error(error);
	}
}

export async function fetchRESTAPIURLModels(plugin: BMOGPT) {
    const RESTAPIURL = plugin.settings.RESTAPIURLConnection.RESTAPIURL;

    // URL Validation
    try {
        new URL(RESTAPIURL);
    } catch (error) {
        console.error('Invalid OpenAI Rest API URL:', RESTAPIURL);
        return;
    }

    const urls = [
        RESTAPIURL + '/v1/models',
        RESTAPIURL + '/api/v1/models'
    ];

    let lastError = null;

    for (const url of urls) {
        try {
            // Initialize headers with Content-Type only
            const headers: { 'Content-Type': string; Authorization?: string } = {
                'Content-Type': 'application/json'
            };

            // If APIKey is provided, add Authorization header
            if (plugin.settings.RESTAPIURLConnection.APIKey) {
                headers.Authorization = `Bearer ${plugin.settings.RESTAPIURLConnection.APIKey}`;
            }

            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: headers,
            });

            // Check if the response is valid
            if (response.json && (response.json.data || Array.isArray(response.json))) {
				let models;
				if (Array.isArray(response.json)) {
					models = response.json.map((model: { id: number; }) => model.id);
				} else {
					models = response.json.data.map((model: { id: number; }) => model.id);
				}

                plugin.settings.RESTAPIURLConnection.RESTAPIURLModels = models;
                return models;
            }
        } catch (error) {
            lastError = error; // Store the last error and continue
        }
    }

    // If all requests failed, throw the last encountered error
    if (lastError) {
        console.error('Error making API request:', lastError);
        throw lastError; // Removed the Notice for simplicity, add back if needed in your environment.
    }
}

export async function fetchMistralModels(plugin: BMOGPT) {
    try {
        const response = await requestUrl({
            url: 'https://api.mistral.ai/v1/models',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plugin.settings.APIConnections.mistral.APIKey}`
            },
        });

        // Check if the response is valid
        if (response.json && response.json.data) {
            const models = response.json.data.map((model: { id: number; }) => model.id);
            plugin.settings.APIConnections.mistral.mistralModels = models;
            return models;
        }
    } catch (error) {
        console.error(error);
        
    }
}

export async function fetchGoogleGeminiModels(plugin: BMOGPT) {
    try {
        const API_KEY = plugin.settings.APIConnections.googleGemini.APIKey;

        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Check if the response is valid and has data
        if (response.json && response.json.models) {
            const models = response.json.models.map((model: { name: string; }) => model.name).filter((model: string) => model.endsWith('models/gemini-pro'));
            
            // Store the models in your plugin's settings or handle them as needed
            plugin.settings.APIConnections.googleGemini.geminiModels = models;
            return models;
        }
    } catch (error) {
        console.error(error);
    }
}



