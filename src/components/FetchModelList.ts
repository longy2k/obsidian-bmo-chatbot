import { requestUrl } from 'obsidian';
import { Ollama } from 'ollama'
import OpenAI from 'openai';
import BMOGPT from 'src/main';
import { OPENAI_MODELS } from 'src/view';

export async function fetchOllamaModels(plugin: BMOGPT) {
        const ollamaRESTAPIURL = plugin.settings.OllamaConnection.RESTAPIURL;

        // Log the list of models using ollama.list()
        try {
            const ollama = new Ollama({host: ollamaRESTAPIURL});
            const modelsList = await ollama.list();
            // console.log('Ollama Models:', modelsList);
            
            // Extracting model names and updating the plugin settings
            const models = modelsList.models.map((model: { name: string }) => model.name);
            plugin.settings.OllamaConnection.ollamaModels = models;
    
            return models;
        } catch (error) {
            console.error('Error fetching models from Ollama:', error);
            return;
        }
}

export async function fetchRESTAPIURLModels(plugin: BMOGPT) {
    const RESTAPIURL = plugin.settings.RESTAPIURLConnection.RESTAPIURL;

    // URL Validation
    try {
        new URL(RESTAPIURL);
    } catch (error) {
        console.error('Invalid REST API URL:', RESTAPIURL);
        return;
    }

    try {
        const response = await requestUrl({
            url: RESTAPIURL + '/models',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plugin.settings.RESTAPIURLConnection.APIKey}`
            },
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
        console.error('Error making API request:', error);
        throw error;
    }
    
}

// Anthropic API models are static. No need to fetch them.

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

        console.log(response.json.models);

        // Check if the response is valid and has data
        if (response.json && response.json.models) {
            const models = response.json.models.map((model: { name: string; }) => model.name).filter((model: string) => model.startsWith('models/gemini'));
            
            // Store the models in your plugin's settings or handle them as needed
            plugin.settings.APIConnections.googleGemini.geminiModels = models;
            return models;
        }
    } catch (error) {
        console.error(error);
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
            console.log(models);
            return models;
        }
    } catch (error) {
        console.error(error);
        
    }
}

export async function fetchOpenAIBaseModels(plugin: BMOGPT) {
    const openai = new OpenAI({
        apiKey: plugin.settings.APIConnections.openAI.APIKey,
        baseURL: plugin.settings.APIConnections.openAI.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

	const list = await openai.models.list();

    if (openai.baseURL == 'https://api.openai.com/v1') {
        plugin.settings.APIConnections.openAI.openAIBaseModels = OPENAI_MODELS;
        return OPENAI_MODELS;
    }
    else {
        const models = list.data.map((model) => model.id);
        plugin.settings.APIConnections.openAI.openAIBaseModels = models;
        return models;
    }

}

export async function fetchOpenRouterModels(plugin: BMOGPT) {
    try {
        const response = await requestUrl({
            url: 'https://openrouter.ai/api/v1/models',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plugin.settings.APIConnections.openRouter.APIKey}`
            },
        });

        // Check if the response is valid
        if (response.json && (response.json.data || Array.isArray(response.json))) {
            let models;
            if (Array.isArray(response.json)) {
                models = response.json.map((model: { id: number; }) => model.id);
            } else {
                models = response.json.data.map((model: { id: number; }) => model.id);
            }

            plugin.settings.APIConnections.openRouter.openRouterModels = models;
            return models;
        }
    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
    
}