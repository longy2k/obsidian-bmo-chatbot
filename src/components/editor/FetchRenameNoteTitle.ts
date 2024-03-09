import { Notice, requestUrl } from 'obsidian';
import OpenAI from 'openai';
import { BMOSettings } from 'src/main';
import { ANTHROPIC_MODELS, OPENAI_MODELS } from 'src/view';

// Rename note title based on specified model
export async function fetchModelRenameTitle(settings: BMOSettings, referenceCurrentNoteContent: string) {
    const clearYamlContent = referenceCurrentNoteContent.replace(/---[\s\S]+?---/, '').trim();
    
    const prompt = `You are a title generator. You will give succinct titles that does not contain backslashes,
                    forward slashes, or colons. Generate a title as your response.\n\n`;

    try {
        if (OPENAI_MODELS.includes(settings.general.model) || (settings.APIConnections.openAI.openAIBaseModels.includes(settings.general.model))) {
            const openai = new OpenAI({
                apiKey: settings.APIConnections.openAI.APIKey,
                baseURL: settings.APIConnections.openAI.openAIBaseUrl,
                dangerouslyAllowBrowser: true, // apiKey is stored within data.json
            });

            const chatCompletion = await openai.chat.completions.create({
                model: settings.general.model,
                max_tokens: 40,
                messages: [
                    { role: 'system', content: prompt + clearYamlContent},
                    { role: 'user', content: ''}
                ],
            });

            let title = chatCompletion.choices[0].message.content;
            // Remove backslashes, forward slashes, colons, and quotes
            if (title) {
                title = title.replace(/[\\/:"]/g, '');
            }

            return title;
        }
        else if (settings.OllamaConnection.RESTAPIURL && settings.OllamaConnection.ollamaModels.includes(settings.general.model)) {
            const url = settings.OllamaConnection.RESTAPIURL + '/api/generate';

            const requestBody = {
                prompt: prompt + '\n\n' + clearYamlContent + '\n\n',
                model: settings.general.model,
                stream: false,
                options: {
                    temperature: parseInt(settings.general.temperature),
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

            // Remove backslashes, forward slashes, colons, and quotes
            if (title) {
                title = title.replace(/[\\/:"]/g, '');
            }

            return title;
        }
        else if (settings.RESTAPIURLConnection.RESTAPIURLModels.includes(settings.general.model)) {
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
                            { role: 'system', content: prompt + clearYamlContent},
                            { role: 'user', content: '\n'}
                        ],
                        max_tokens: 40,
                    }),
                });
    
                let title = response.json.choices[0].message.content;

                // Remove backslashes, forward slashes, colons, and quotes
                if (title) {
                    title = title.replace(/[\\/:"]/g, '');
                }
                return title;
    
            } catch (error) {
                console.error('Error making API request:', error);
                throw error;
            }
        }
        else if (settings.APIConnections.openRouter.openRouterModels.includes(settings.general.model)) {
            try {
                const response = await requestUrl({
                    url: 'https://openrouter.ai/api/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
                    },
                    body: JSON.stringify({
                        model: settings.general.model,
                        messages: [
                            { role: 'system', content: prompt + clearYamlContent},
                            { role: 'user', content: '\n'}
                        ],
                        max_tokens: 40,
                    }),
                });
    
                let title = response.json.choices[0].message.content;

                // Remove backslashes, forward slashes, colons, and quotes
                if (title) {
                    title = title.replace(/[\\/:"]/g, '');
                }
                return title;
    
            } catch (error) {
                console.error('Error making API request:', error);
                throw error;
            }

        }
        else if (settings.APIConnections.mistral.mistralModels.includes(settings.general.model)) {
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
                            { role: 'system', content: prompt + clearYamlContent},
                            { role: 'user', content: '\n'}
                        ],
                        max_tokens: 40,
                    }),
                });
    
                let title = response.json.choices[0].message.content;

                // Remove backslashes, forward slashes, colons, and quotes
                if (title) {
                    title = title.replace(/[\\/:"]/g, '');
                }
                return title;
    
            } catch (error) {
                console.error(error);
            }

        }
        else if (settings.APIConnections.googleGemini.geminiModels.includes(settings.general.model)) {
            try {        
                const API_KEY = settings.APIConnections.googleGemini.APIKey;
        
                const requestBody = {
                    contents: [{
                        parts: [
                            {text: prompt + clearYamlContent}
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
                
                let title = response.json.candidates[0].content.parts[0].text;
                // Remove backslashes, forward slashes, colons, and quotes
                if (title) {
                    title = title.replace(/[\\/:"]/g, '');
                }
                return title;
            } catch (error) {
                console.error(error);
            }
        }
        else if(ANTHROPIC_MODELS.includes(settings.general.model)) {
            const headers = {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.APIConnections.anthropic.APIKey,
              };
          
              const requestBody = {
                  model: settings.general.model,
                  prompt:  `\n\nHuman: ${prompt}\n\nAssistant:`,
                  max_tokens_to_sample: 40,
                  temperature: parseInt(settings.general.temperature),
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

                // Remove backslashes, forward slashes, colons, and quotes
                if (title) {
                    title = title.replace(/[\\/:"]/g, '');
                }
            
                return title;
            
              } catch (error) {
                new Notice('Error making API request:', error);
                console.error('Error making API request:', error);
                throw error;
              }
        }
        else {
            throw new Error('Invalid model selected for renaming note title. Please check your settings.');
        }
    } catch (error) {
        console.log('ERROR');
        throw new Error(error.response?.data?.error || error.message);
    }
}