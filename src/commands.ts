import { Notice } from "obsidian";
import { BMOSettings, DEFAULT_SETTINGS } from "./main";
import { colorToHex } from "./settings";
import { addMessage} from "./view";

export async function commandInspect(currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
  const botMessage = document.createElement("div");
  botMessage.classList.add("botMessage");
  botMessage.style.backgroundColor = colorToHex(
    currentSettings.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
  );
  messageContainer?.appendChild(botMessage);

  const botNameSpan = document.createElement("span");
  botNameSpan.textContent =
    currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
  botNameSpan.setAttribute("id", "chatbotName");
  botMessage.appendChild(botNameSpan);

  const messageBlock = document.createElement("div");
  messageBlock.classList.add("messageBlock");
  botMessage.appendChild(messageBlock);


  if (messageContainer) {
    const botMessages = messageContainer.querySelectorAll(".botMessage");
    const lastBotMessage = botMessages[botMessages.length - 1];
  
    const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
  
    if (messageBlock2) {
      // Assuming currentSettings is a JSON object
      const settingsObj = currentSettings;
  
      // Convert the JSON object into a formatted string
      let formattedSettings = '';
      if (settingsObj) {
        formattedSettings += `
          <div class="formattedSettings">
            <h2>Inspect</h2>
            <p><strong>MODEL:</strong> ${settingsObj.model}</p>
            <p><strong>SYSTEM:</strong> "${settingsObj.system_role}"</p>
            <p><strong>MAX TOKENS:</strong> "${settingsObj.max_tokens}"</p>
            <p><strong>TEMPERATURE:</strong> ${settingsObj.temperature}</p>
            <p><strong>REFERENCE CURRENT NOTE:</strong> ${settingsObj.referenceCurrentNote}</p>
            <p><strong>USERNAME:</strong> ${settingsObj.userName}</p>
            <p><strong>CHATBOT NAME:</strong> ${settingsObj.chatbotName}</p>
            <p><strong>USER BACKGROUND COLOR:</strong> "${settingsObj.userMessageBackgroundColor}"</p>
            <p><strong>BOT BACKGROUND COLOR:</strong> "${settingsObj.botMessageBackgroundColor}"</p>
            <p><strong>REST API URL:</strong> "${settingsObj.restAPIUrl}"</p>
          </div>
        `;
      }
  
      // Set the formatted settings as innerHTML
      messageBlock2.innerHTML = formattedSettings;
  
      addMessage(messageBlock.innerHTML, 'botMessage', this.settings);

      const botMessages = messageContainer.querySelectorAll(".botMessage");
      const lastBotMessage = botMessages[botMessages.length - 1];

      lastBotMessage.appendChild(messageBlock2);
      lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
}

export function commandHelp(currentSettings: BMOSettings) {
    const messageContainer = document.querySelector("#messageContainer");
    const botMessage = document.createElement("div");
    botMessage.classList.add("botMessage");
    botMessage.style.backgroundColor = colorToHex(
      currentSettings.botMessageBackgroundColor ||
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
    );
    messageContainer?.appendChild(botMessage);
  
    const botNameSpan = document.createElement("span");
    botNameSpan.textContent =
      currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
    botNameSpan.setAttribute("id", "chatbotName");
    botMessage.appendChild(botNameSpan);
  
    const messageBlock = document.createElement("div");
    messageBlock.classList.add("messageBlock");
    botMessage.appendChild(messageBlock);
  
  
    if (messageContainer) {
      const botMessages = messageContainer.querySelectorAll(".botMessage");
      const lastBotMessage = botMessages[botMessages.length - 1];
    
      const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
    
      if (messageBlock2) {
        // Assuming currentSettings is a JSON object
        const settingsObj = currentSettings;
    
        // Convert the JSON object into a formatted string
        let formattedSettings = '';
        if (settingsObj) {
          formattedSettings += `
            <div class="formattedSettings">
              <h2>Help</h2>
              <div><strong>/inspect</strong> (Show System Settings)</p>
              <p><strong>/model</strong> "" | "[VALUE]" (List or change model)</p>
              <p><strong>/system</strong> "[VALUE]" (Change system setting)</p>
              <p><strong>/maxtokens</strong> [VALUE] (Set max tokens)</p>
              <p><strong>/temp</strong> [VALUE] (Temperature range from 0 to 1)</p>
              <p><strong>/ref</strong> on | off (Allow reference current note)</p>
            </div>
          `;
        }
    
        // Set the formatted settings as innerHTML
        messageBlock2.innerHTML = formattedSettings;
    
        addMessage(messageBlock.innerHTML, 'botMessage', this.settings);

        const botMessages = messageContainer.querySelectorAll(".botMessage");
        const lastBotMessage = botMessages[botMessages.length - 1];

        lastBotMessage.appendChild(messageBlock2);
        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }  
}

export function commandModel(input: string, currentSettings: BMOSettings) {
    const messageContainer = document.querySelector("#messageContainer");
    const botMessage = document.createElement("div");
    botMessage.classList.add("botMessage");
    botMessage.style.backgroundColor = colorToHex(
      currentSettings.botMessageBackgroundColor ||
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
    );
    messageContainer?.appendChild(botMessage);
  
    const botNameSpan = document.createElement("span");
    botNameSpan.textContent =
      currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
    botNameSpan.setAttribute("id", "chatbotName");
    botMessage.appendChild(botNameSpan);
  
    const messageBlock = document.createElement("div");
    messageBlock.classList.add("messageBlock");
    botMessage.appendChild(messageBlock);
  
  
    if (messageContainer) {
      const botMessages = messageContainer.querySelectorAll(".botMessage");
      const lastBotMessage = botMessages[botMessages.length - 1];
    
      const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
    
      if (messageBlock2) {
        if (input.split(' ')[1] != undefined) {


          const inputModel = input.split(' ')[1].replace(/^"(.*)"$/, '$1');
          const apiKey = currentSettings.apiKey;
  
          // Define the valid models for each API key
          const anthropicApiKeyModels = {
            "1":"claude-instant-1.2claude-2.0", 
            "2":"claude-2.0"
          };
          const openAiApiModelAliases = {
            "1": "gpt-3.5-turbo",
            "2": "gpt-3.5-turbo-16k",
            "3": "gpt-4"
          };
          
          if (apiKey.startsWith("sk-ant")) {
            if (anthropicApiKeyModels[inputModel as keyof typeof anthropicApiKeyModels]) {
              currentSettings.model = anthropicApiKeyModels[inputModel as keyof typeof anthropicApiKeyModels];
              messageBlock2.innerHTML = `
                <div class="formattedSettings">
                  <p><strong>Updated Model to ${anthropicApiKeyModels[inputModel as keyof typeof anthropicApiKeyModels]}</strong></p>
                </div>`;
            } else {
              // Model is not valid for "sk-ant" API key
              messageBlock2.innerHTML = `
                <div class="formattedSettings">
                  <p><strong>Model '${inputModel}' does not exist for this API key.</strong></p>
                </div>`;
            }
            addMessage(messageBlock.innerHTML, 'botMessage', currentSettings);
            return currentSettings;
          } else if (apiKey.startsWith("sk-")) {
            if (openAiApiModelAliases[inputModel as keyof typeof openAiApiModelAliases]) {
              // Model is valid for generic "sk-" API key
              currentSettings.model = openAiApiModelAliases[inputModel as keyof typeof openAiApiModelAliases];
              messageBlock2.innerHTML = `
                <div class="formattedSettings">
                  <p><strong>Updated Model to ${openAiApiModelAliases[inputModel as keyof typeof openAiApiModelAliases]}</strong></p>
                </div>`;
            } else {
              // Model is not valid for generic "sk-" API key
              messageBlock2.innerHTML = `
                <div class="formattedSettings">
                  <p><strong>Model '${inputModel}' does not exist for this API key.</strong></p>
                </div>`;
            }
            addMessage(messageBlock.innerHTML, 'botMessage', currentSettings);
            return currentSettings;
          } else {
            // Invalid API key
            messageBlock2.innerHTML = `
              <div class="formattedSettings">
                <p><strong>Invalid API key.</strong></p>
              </div>`;
              addMessage(messageBlock.innerHTML, 'botMessage', currentSettings);
          }

        }
        else {

            // Assuming currentSettings is a JSON object
            const settingsObj = currentSettings;

            // Convert the JSON object into a formatted string
            let formattedSettings = '';
            if (settingsObj) {
            formattedSettings += `
                <div class="formattedSettings">
                    <p><strong>Models</strong>
                <ul>
            `;

            // Assuming 'models' in settingsObj is an array
            settingsObj.models.forEach((model: any) => {
                formattedSettings += `
                <li>${model}</li>
                `;
            });

            // Check if apiKey is not empty and add 'gpt-3' if true
            if (currentSettings.apiKey && ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(currentSettings.model)) {
                formattedSettings += `
                <li>gpt-3.5-turbo</li>
                <li>gpt-3.5-turbo-16k</li>
                <li>gpt-4</li>
                `;
            }

            // Check if apiKey is not empty and add 'gpt-3' if true
            if (currentSettings.apiKey && ["claude-2.0", "claude-instant-1.2"].includes(currentSettings.model)) {
                formattedSettings += `
                    <li>claude-2.0</li>
                    <li>claude-instant-1.2</li>
                `;
            }

            formattedSettings += `
                    </ul>
                    </div>
                `;
                }
            

                // Set the formatted settings as innerHTML
                messageBlock2.innerHTML = formattedSettings;
                    
                addMessage(messageBlock.innerHTML, 'botMessage', this.settings);
                

                const botMessages = messageContainer.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];

                lastBotMessage.appendChild(messageBlock2);
                lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }  
        }
    }

export function commandReference(input: string, currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
    const botMessage = document.createElement("div");
    botMessage.classList.add("botMessage");
    botMessage.style.backgroundColor = colorToHex(
      currentSettings.botMessageBackgroundColor ||
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
    );
    messageContainer?.appendChild(botMessage);
  
    const botNameSpan = document.createElement("span");
    botNameSpan.textContent =
      currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
    botNameSpan.setAttribute("id", "chatbotName");
    botMessage.appendChild(botNameSpan);
  
    const messageBlock = document.createElement("div");
    messageBlock.classList.add("messageBlock");
    botMessage.appendChild(messageBlock);
  
  
    if (messageContainer) {
      const botMessages = messageContainer.querySelectorAll(".botMessage");
      const lastBotMessage = botMessages[botMessages.length - 1];
    
      const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
    
      if (messageBlock2) {
        const settingsObj = currentSettings;
    
        let formattedSettings = '';
        if (settingsObj) {
          formattedSettings += `
            <div class="formattedSettings">
              <p><strong>Reference updated: ${input.split(' ')[1]}</strong></p>
            </div>
          `;
        }
    
        messageBlock2.innerHTML = formattedSettings;
        const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
    
        if (input.split(' ')[1] != undefined) {
          const inputValue = input.split(' ')[1].toLowerCase();
          if (inputValue === "true" || inputValue === "on") {
            currentSettings.referenceCurrentNote = true;
  
            if (referenceCurrentNoteElement) {
                referenceCurrentNoteElement.style.display = 'block';
            }
          }
          else if (inputValue === "false" || inputValue === "off") {
            currentSettings.referenceCurrentNote = false;
            if (referenceCurrentNoteElement) {
              referenceCurrentNoteElement.style.display = 'none';
          }
          }
          else {
            new Notice("Invalid command");
          }
        }
    
        addMessage(messageBlock2.innerHTML, 'botMessage', this.settings);
    
        const botMessages = messageContainer.querySelectorAll(".botMessage");
        const lastBotMessage = botMessages[botMessages.length - 1];
    
        lastBotMessage.appendChild(messageBlock2);
        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
     
}

export function commandTemperature(input: string, currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
    const botMessage = document.createElement("div");
    botMessage.classList.add("botMessage");
    botMessage.style.backgroundColor = colorToHex(
      currentSettings.botMessageBackgroundColor ||
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
    );
    messageContainer?.appendChild(botMessage);
  
    const botNameSpan = document.createElement("span");
    botNameSpan.textContent =
      currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
    botNameSpan.setAttribute("id", "chatbotName");
    botMessage.appendChild(botNameSpan);
  
    const messageBlock = document.createElement("div");
    messageBlock.classList.add("messageBlock");
    botMessage.appendChild(messageBlock);
  
  
    if (messageContainer) {
      const botMessages = messageContainer.querySelectorAll(".botMessage");
    
      if (botMessages.length > 0) {
        const lastBotMessage = botMessages[botMessages.length - 1];
        const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
    
        if (messageBlock2) {
          const inputValue = input.split(' ')[1];
          const floatValue = parseFloat(inputValue);
    
          if (currentSettings) {
            if (!isNaN(floatValue) && floatValue >= 0.00 && floatValue <= 1.00) {
              currentSettings.temperature = parseFloat((Math.round(floatValue / 0.05) * 0.05).toFixed(2));
              const formattedSettings = `
                <div class="formattedSettings">
                  <p><strong>Temperature updated: ${currentSettings.temperature}</strong></p>
                </div>
              `;              
              messageBlock2.innerHTML = formattedSettings;
            } else {
              const formattedSettings = `
                <div class="formattedSettings">
                  <p><strong>Temperature updated: invalid</strong></p>
                </div>
              `;
              messageBlock2.innerHTML = formattedSettings;
            }
          } else {
            const formattedSettings = `
              <div class="formattedSettings">
                <p><strong>Temperature updated: invalid</strong></p>
              </div>
            `;
            messageBlock2.innerHTML = formattedSettings;
          }
    
          addMessage(messageBlock2.innerHTML, 'botMessage', this.settings);
    
          const updatedBotMessages = messageContainer.querySelectorAll(".botMessage");
          const updatedLastBotMessage = updatedBotMessages[updatedBotMessages.length - 1];
          updatedLastBotMessage.appendChild(messageBlock2);
          updatedLastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }    
     
}

export async function commandFalse(currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
  const botMessage = document.createElement("div");
  botMessage.classList.add("botMessage");
  botMessage.style.backgroundColor = colorToHex(
    currentSettings.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
  );
  messageContainer?.appendChild(botMessage);

  const botNameSpan = document.createElement("span");
  botNameSpan.textContent =
    currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
  botNameSpan.setAttribute("id", "chatbotName");
  botMessage.appendChild(botNameSpan);

  const messageBlock = document.createElement("div");
  messageBlock.classList.add("messageBlock");
  botMessage.appendChild(messageBlock);


  if (messageContainer) {
    const botMessages = messageContainer.querySelectorAll(".botMessage");
    const lastBotMessage = botMessages[botMessages.length - 1];
  
    const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
  
    if (messageBlock2) {
      // Assuming currentSettings is a JSON object
      const settingsObj = currentSettings;
  
      // Convert the JSON object into a formatted string
      let formattedSettings = '';
      if (settingsObj) {
        formattedSettings += `
          <div class="formattedSettings">
            <p><strong>Command not recognized.</strong></p>
        `;
      }
  
      // Set the formatted settings as innerHTML
      messageBlock2.innerHTML = formattedSettings;
  
      addMessage(messageBlock.innerHTML, 'botMessage', this.settings);

      const botMessages = messageContainer.querySelectorAll(".botMessage");
      const lastBotMessage = botMessages[botMessages.length - 1];

      lastBotMessage.appendChild(messageBlock2);
      lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
}

export function commandMaxTokens(input: string, currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
  const botMessage = document.createElement("div");
  botMessage.classList.add("botMessage");
  botMessage.style.backgroundColor = colorToHex(
    currentSettings.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
  );
  messageContainer?.appendChild(botMessage);

  const botNameSpan = document.createElement("span");
  botNameSpan.textContent =
    currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
  botNameSpan.setAttribute("id", "chatbotName");
  botMessage.appendChild(botNameSpan);

  const messageBlock = document.createElement("div");
  messageBlock.classList.add("messageBlock");
  botMessage.appendChild(messageBlock);


  if (messageContainer) {
    const botMessages = messageContainer.querySelectorAll(".botMessage");
    const lastBotMessage = botMessages[botMessages.length - 1];
  
    const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
  
    if (messageBlock2) {
  
      let formattedSettings = '';
      const maxTokensValue = input.split(' ')[1];
  
      if (maxTokensValue !== undefined && maxTokensValue !== '') {
        const inputValue = parseInt(maxTokensValue);
  
        if (!isNaN(inputValue) && inputValue >= 0) {
          // Update max_tokens with the valid integer value
          currentSettings.max_tokens = inputValue.toString();
          formattedSettings += `
            <div class="formattedSettings">
              <p><strong>Max tokens updated: ${inputValue}</strong></p>
            </div>
          `;
        } else {
          // Input is not a valid integer
          formattedSettings += `
            <div class="formattedSettings">
              <p><strong>Max tokens updated: invalid</strong></p>
            </div>
          `;
        }
      } else {
        // Clear max_tokens and inform the user
        currentSettings.max_tokens = "";
        formattedSettings += `
          <div class="formattedSettings">
            <p><strong>Max tokens cleared.</strong></p>
          </div>
        `;
      }
  
      messageBlock2.innerHTML = formattedSettings;
      addMessage(messageBlock2.innerHTML, 'botMessage', this.settings);
  
      lastBotMessage.appendChild(messageBlock2);
      lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
}


export function commandSystem(input: string, currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");
  const botMessage = document.createElement("div");
  botMessage.classList.add("botMessage");
  botMessage.style.backgroundColor = colorToHex(
    currentSettings.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim()
  );
  messageContainer?.appendChild(botMessage);

  const botNameSpan = document.createElement("span");
  botNameSpan.textContent =
    currentSettings.chatbotName || DEFAULT_SETTINGS.chatbotName;
  botNameSpan.setAttribute("id", "chatbotName");
  botMessage.appendChild(botNameSpan);

  const messageBlock = document.createElement("div");
  messageBlock.classList.add("messageBlock");
  botMessage.appendChild(messageBlock);

  if (messageContainer) {
    const botMessages = messageContainer.querySelectorAll(".botMessage");
    const lastBotMessage = botMessages[botMessages.length - 1];
  
    const messageBlock2 = lastBotMessage.querySelector(".messageBlock");
  
    if (messageBlock2) {
      let formattedSettings = '';
      const systemPromptValue = input.match(/"([^"]+)"/);
  
      if (systemPromptValue !== null) {
        if (systemPromptValue[1]) {
          currentSettings.system_role = systemPromptValue[1];
          formattedSettings += `
            <div class="formattedSettings">
              <p><strong>System updated: "${systemPromptValue[1]}"</strong></p>
            </div>
          `;
        }
      } else {
        currentSettings.system_role = "";
        formattedSettings += `
          <div class="formattedSettings">
            <p><strong>System cleared.</strong></p>
          </div>
        `;
      }
  
      messageBlock2.innerHTML = formattedSettings;
      addMessage(messageBlock2.innerHTML, 'botMessage', this.settings);
  
      lastBotMessage.appendChild(messageBlock2);
      lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}