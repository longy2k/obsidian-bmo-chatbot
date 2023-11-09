import { BMOSettings, DEFAULT_SETTINGS } from "./main";
import { colorToHex } from "./settings";
import { addMessage } from "./view";

// Function to create and append a bot message
function createBotMessage(currentSettings: BMOSettings): HTMLDivElement {
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

  return messageBlock;
}

// Function to display the message in the Chatbot
function displayMessage(messageBlock: HTMLDivElement, messageHtml: string, currentSettings: BMOSettings) {
  const messageContainer = document.querySelector("#messageContainer");

  if (messageContainer) {
    const botMessages = messageContainer.querySelectorAll(".botMessage");
    const lastBotMessage = botMessages[botMessages.length - 1];

    const messageBlock2 = lastBotMessage.querySelector(".messageBlock");

    if (messageBlock2) {
      messageBlock2.innerHTML = messageHtml;
      addMessage(messageBlock.innerHTML, 'botMessage', currentSettings);

      lastBotMessage.appendChild(messageBlock2);
      lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// =================== COMMANDS ===================

// `/help` for help commands
export function commandHelp(currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  const formattedSettings = `
    <div class="formattedSettings">
      <h2>Help</h2>
      <p><strong>/inspect</strong> - Show System Settings</p>
      <p><strong>/model</strong> "[VALUE]" - Change model</p>
      <p><strong>/system</strong> "[VALUE]" - Change system setting</p>
      <p><strong>/maxtokens</strong> [VALUE] - Set max tokens</p>
      <p><strong>/temp</strong> [VALUE] - Temperature range from 0 to 1</p>
      <p><strong>/ref</strong> on | off - Allow reference current note</p>
      <p><strong>/clear or /c</strong> - Clear chat conversation</p>
    </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/inspect` to inspect settings
export function commandInspect(currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);
  
  const formattedSettings = `
    <div class="formattedSettings">
      <h2>Inspect</h2>
      <p><strong>MODEL:</strong> ${currentSettings.model}</p>
      <p><strong>SYSTEM:</strong> "${currentSettings.system_role}"</p>
      <p><strong>MAX TOKENS:</strong> "${currentSettings.max_tokens}"</p>
      <p><strong>TEMPERATURE:</strong> ${currentSettings.temperature}</p>
      <p><strong>REFERENCE CURRENT NOTE:</strong> ${currentSettings.referenceCurrentNote}</p>
      <p><strong>USERNAME:</strong> ${currentSettings.userName}</p>
      <p><strong>CHATBOT NAME:</strong> ${currentSettings.chatbotName}</p>
      <p><strong>USER BACKGROUND COLOR:</strong> "${currentSettings.userMessageBackgroundColor}"</p>
      <p><strong>BOT BACKGROUND COLOR:</strong> "${currentSettings.botMessageBackgroundColor}"</p>
      <p><strong>REST API URL:</strong> "${currentSettings.restAPIUrl}"</p>
    </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/model "[VALUE]"` to change model.
export function commandModel(input: string, currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  // Check if the user has not specified a model after the "/model" command
  if (!input.split(' ')[1]) {
    const messageHtml = `<div class="formattedSettings"><p><strong>Please select a model.</strong></p></div>`;
    displayMessage(messageBlock, messageHtml, currentSettings);
    return;
  }

  if (input.split(' ')[1] !== undefined) {
    const inputModel = input.split(' ')[1].replace(/^"(.*)"$/, '$1');

    const anthropicApiKeyModels = {
      "1": "claude-instant-1.2",
      "2": "claude-2.0",
    };
    const openAiApiModelAliases = {
      "1": "gpt-3.5-turbo",
      "2": "gpt-3.5-turbo-16k",
      "3": "gpt-4",
    };

    let messageHtml = "";

    if (currentSettings.apiKey.startsWith("sk-ant")) {
      if (anthropicApiKeyModels[inputModel as keyof typeof anthropicApiKeyModels] || ["claude-instant-1.2", "claude-2.0"].includes(inputModel as string)) {
        currentSettings.model = anthropicApiKeyModels[inputModel as keyof typeof anthropicApiKeyModels] ?? inputModel;
        messageHtml = `<div class="formattedSettings"><p><strong>Updated Model to ${currentSettings.model}</strong></p></div>`;
      } else {
        messageHtml = `<div class="formattedSettings"><p><strong>Model '${inputModel}' does not exist for this API key.</strong></p></div>`;
      }
    } else if (currentSettings.apiKey.startsWith("sk-")) {
      if (openAiApiModelAliases[inputModel as keyof typeof openAiApiModelAliases] || ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(inputModel)) {
        currentSettings.model = openAiApiModelAliases[inputModel as keyof typeof openAiApiModelAliases] || inputModel;
        messageHtml = `<div class="formattedSettings"><p><strong>Updated Model to ${currentSettings.model}</strong></p></div>`;
      } else {
        messageHtml = `<div class="formattedSettings"><p><strong>Model '${inputModel}' does not exist for this API key.</strong></p></div>`;
      }
    } else {
      messageHtml = `<div class="formattedSettings"><p><strong>Invalid API key.</strong></p></div>`;
    }

    displayMessage(messageBlock, messageHtml, currentSettings);
    return currentSettings;
  } else {
    const settingsObj = currentSettings;
    let formattedSettings = '';

    if (settingsObj) {
      formattedSettings += `<div class="formattedSettings"><p><strong>Models</strong></p>`;
      settingsObj.models.forEach((model: string) => {
        formattedSettings += `<p>${model}</p>`;
      });
      
      if (currentSettings.apiKey && ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(currentSettings.model)) {
        formattedSettings += `<p>gpt-3.5-turbo</p><p>gpt-3.5-turbo-16k</p><p>gpt-4</p>`;
      }
      if (currentSettings.apiKey && ["claude-2.0", "claude-instant-1.2"].includes(currentSettings.model)) {
        formattedSettings += `<p>claude-2.0</p><p>claude-instant-1.2</p>`;
      }
    }
    displayMessage(messageBlock, formattedSettings, currentSettings);
  }
}

// `/ref` to turn on/off referenceCurrentNote
export function commandReference(input: string, currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  let formattedSettings = '';
  const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
  const inputValue = input.split(' ')[1]?.toLowerCase();

  if (inputValue === "true" || inputValue === "on") {
      currentSettings.referenceCurrentNote = true;
      if (referenceCurrentNoteElement) {
          referenceCurrentNoteElement.style.display = 'block';
      }
      formattedSettings += `
          <div class="formattedSettings">
            <p><strong>Reference updated: on</strong></p>
          </div>
      `;
  } else if (inputValue === "false" || inputValue === "off") {
      currentSettings.referenceCurrentNote = false;
      if (referenceCurrentNoteElement) {
          referenceCurrentNoteElement.style.display = 'none';
      }
      formattedSettings += `
          <div class="formattedSettings">
            <p><strong>Reference updated: off</strong></p>
          </div>
      `;
  } else {
    formattedSettings += `
        <div class="formattedSettings">
          <p><strong>Invalid command.</strong></p>
        </div>
    `;
  }

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/temp "VALUE"` to change the temperature
export function commandTemperature(input: string, currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  const inputValue = input.split(' ')[1];
  const floatValue = parseFloat(inputValue);
  let temperatureSettingMessage: string;

  if (currentSettings && !isNaN(floatValue) && floatValue >= 0.00 && floatValue <= 1.00) {
      currentSettings.temperature = parseFloat((Math.round(floatValue / 0.05) * 0.05).toFixed(2));
      temperatureSettingMessage = `${currentSettings.temperature}`;
  } else {
      temperatureSettingMessage = "Invalid.";
  }

  const formattedSettings = `
      <div class="formattedSettings">
        <p><strong>Temperature updated: ${temperatureSettingMessage}</strong></p>
      </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

export async function commandFalse(currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  const formattedSettings = `
      <div class="formattedSettings">
          <p><strong>Command not recognized.</strong></p>
      </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/maxtokens` to change max_tokens
export function commandMaxTokens(input: string, currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  let formattedSettings = '';
  const maxTokensValue = input.split(' ')[1];
  let maxTokensSettingMessage: string;

  if (maxTokensValue !== undefined && maxTokensValue !== '') {
      const inputValue = parseInt(maxTokensValue);
  
      if (!isNaN(inputValue) && inputValue >= 0) {
          // Update max_tokens with the valid integer value
          currentSettings.max_tokens = inputValue.toString();
          maxTokensSettingMessage = `Max tokens updated: ${inputValue}`;
      } else {
          // Input is not a valid integer
          maxTokensSettingMessage = "Max tokens update: invalid";
      }
  } else {
      // Clear max_tokens and inform the user
      currentSettings.max_tokens = "";
      maxTokensSettingMessage = "Max tokens cleared.";
  }
  
  formattedSettings += `
      <div class="formattedSettings">
          <p><strong>${maxTokensSettingMessage}</strong></p>
      </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/system "[VALUE]"` to change system prompt
export function commandSystem(input: string, currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

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

  displayMessage(messageBlock, formattedSettings, currentSettings);
}
