import { Notice, requestUrl } from "obsidian";
import OpenAI from "openai";
import { BMOSettings } from "src/main";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "src/view";
// import { getActiveFileContent, getCurrentNoteContent } from "./ReferenceCurrentNote";

// Rename note title based on specified model
export async function fetchModelRenameTitle(settings: BMOSettings, referenceCurrentNoteContent: string) {
    const clearYamlContent = referenceCurrentNoteContent.replace(/---[\s\S]+?---/, '').trim();
    
    const prompt = `You are a title generator. You will give succinct titles that does not contain backslashes,
                    forward slashes, or colons. Please generate one title as your response.\n\n`;

    try {
        if (OPENAI_MODELS.includes(settings.model) || settings.openAIBaseModels.includes(settings.model)) {

            const openai = new OpenAI({
                apiKey: settings.apiKey,
                baseURL: settings.openAIBaseUrl,
                dangerouslyAllowBrowser: true, // apiKey is stored within data.json
            });

            const chatCompletion = await openai.chat.completions.create({
                model: settings.model,
                max_tokens: 40,
                messages: [
                    { role: 'system', content: prompt + clearYamlContent},
                ],
            });

            let title = chatCompletion.choices[0].message.content;
            // Remove backslashes, forward slashes, colons, and quotes
            if (title) {
                title = title.replace(/[\\/:"]/g, '');
            }

            return title;
        }
        else if(ANTHROPIC_MODELS.includes(settings.model)) {
            const headers = {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.apiKey,
              };
          
              const requestBody = {
                  model: settings.model,
                  prompt:  `\n\nHuman: ${prompt}\n\nAssistant:`,
                  max_tokens_to_sample: 40,
                  temperature: settings.temperature,
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
            if (settings.ollamaRestAPIUrl && settings.ollamaModels.includes(settings.model)) {
                const url = settings.ollamaRestAPIUrl + '/api/generate';
    
                const requestBody = {
                    prompt: prompt + '\n\n' + clearYamlContent + '\n\n',
                    model: settings.model,
                    stream: false,
                    options: {
                        temperature: settings.temperature,
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
            else if (settings.openAIRestAPIUrl && settings.openAIRestAPIModels.includes(settings.model)) {
                try {
                    const response = await requestUrl({
                        url: settings.openAIRestAPIUrl + '/v1/chat/completions',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${settings.apiKey}`
                        },
                        body: JSON.stringify({
                            model: settings.model,
                            messages: [
                                { role: 'system', content: prompt + clearYamlContent},
                            ],
                            max_tokens: 40,
                            temperature: settings.temperature,
                        }),
                    });
        
                    const message = response.json.choices[0].message.content;
                    return message;
        
                } catch (error) {
                    console.error('Error making API request:', error);
                    throw error;
                }
            }
        }
    } catch (error) {
        console.log("ERROR");
        throw new Error(error.response?.data?.error || error.message);
    }
}