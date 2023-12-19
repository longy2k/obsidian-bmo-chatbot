import { requestUrl } from "obsidian";
import BMOGPT from "src/main";

// Fetch OLLAMA models from OLLAMA REST API
export async function fetchOllamaModels(plugin: BMOGPT) {
	const ollamaRestAPIUrl = plugin.settings.ollamaRestAPIUrl;

	// if (!ollamaRestAPIUrl) {
	// 	return;
	// }

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

export async function fetchLocalAIModels(plugin: BMOGPT) {
	const localAIRestAPIUrl = plugin.settings.localAIRestAPIUrl;

	if (!localAIRestAPIUrl) {
		return;
	}

	const url = localAIRestAPIUrl + '/v1/models';

	try {
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const jsonData = response.json;

		const models = jsonData.data.map((model: { id: number; }) => model.id); 

		plugin.settings.localAIModels = models;  

		return models;

	} catch (error) {
		console.error('Error:', error);
	}
}