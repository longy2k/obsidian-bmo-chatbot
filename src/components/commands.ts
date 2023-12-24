import { Notice } from 'obsidian';
import { BMOSettings, DEFAULT_SETTINGS } from "../main";
import { colorToHex } from "../utils/ColorConverter";
import { addMessage, filenameMessageHistoryJSON, getActiveFileContent, removeMessageThread } from "../view";
import BMOGPT from '../main';
import { fetchModelRenameTitle, getAbortController } from './FetchModel';

// Commands
export function executeCommand(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const command = input.split(' ')[0]; // Get the first word from the input
  
  switch (command) {
      case '/commands':
      case '/help':
          commandHelp(settings);
          break;
      case '/model':
          return commandModel(input, settings, plugin);
      case '/list':
          return commandListModels(input, settings, plugin);
      case '/reference':
      case '/ref':
          commandReference(input, settings, plugin);
          break;
      case '/temp':
          commandTemperature(input, settings, plugin);
          break;
      case '/maxtokens':
          commandMaxTokens(input, settings, plugin);
          break;
      case '/system':
          commandSystem(input, settings, plugin);
          break;
      case '/append':
          commandAppend(settings);
          break;
      case '/save':
          commandSave(settings);
          break;
      case '/clear':
      case '/c':
          removeMessageThread(0);
          break;
      case '/stop':
      case '/s':
          commandStop();
          break;
      default:
          commandFalse(settings, plugin);
  }
}

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
  // botNameSpan.setAttribute("id", "chatbotName");
  botNameSpan.className = "chatbotName";
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

export async function commandFalse(currentSettings: BMOSettings, plugin: BMOGPT) {
  const messageBlock = createBotMessage(currentSettings);

  const formattedSettings = `
      <div class="formattedSettings">
          <p><strong>Command not recognized.</strong></p>
      </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
  await plugin.saveSettings();
  // new Notice("Invalid command.");
}

// =================== COMMAND FUNCTIONS ===================

// `/help` for help commands
export function commandHelp(currentSettings: BMOSettings) {
  const messageBlock = createBotMessage(currentSettings);

  const formattedSettings = `
    <div class="formattedSettings">
      <h2>Commands</h2>
      <p><code>/list</code> - List models.</p>
      <p><code>/model "[MODEL-NAME]" or [VALUE]</code> - Change model.</p>
      <p><code>/system "[PROMPT]"</code> - Change system setting.</p>
      <p><code>/maxtokens [VALUE]</code> - Set max tokens.</p>
      <p><code>/temp [VALUE]</code> - Change temperature range 0 from to 1.</p>
      <p><code>/ref on | off</code> - Turn on or off "reference current note".</p>
      <p><code>/append</code> - Append current chat history to current active note.</p>
      <p><code>/save</code> - Save current chat history to a note.</p>
      <p><code>/clear</code> or <code>/c</code> - Clear chat history.</p>
      <p><code>/stop</code> or <code>/s</code> - [STREAMING MODELS ONLY]: Stop fetching response.</p>
    </div>
  `;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}

// `/model "[VALUE]"` to change model.
export async function commandModel(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
  const messageBlock = createBotMessage(currentSettings);

  // Check if the user has not specified a model after the "/model" command
  if (!input.split(' ')[1]) {
    const messageHtml = `<div class="formattedSettings"><p><strong>Please select a model.</strong></p></div>`;
    displayMessage(messageBlock, messageHtml, currentSettings);
    return;
  }

  // Check if the user has specified a model after the "/model" command
  if (input.split(' ')[1] !== undefined) {
    const inputModel = input.split(' ')[1].replace(/^"(.*)"$/, '$1');

    let messageHtml = "";

    const modelAliases: { [key: string]: string } = {};

    for (let i = 1; i <= currentSettings.allModels.length; i++) {
      const model = currentSettings.allModels[i - 1];
      modelAliases[i] = model;
    }

    if (Object.entries(modelAliases).find(([key, val]) => key === inputModel)){
      currentSettings.model = modelAliases[inputModel];
      messageHtml = `<div class="formattedSettings"><p><strong>Updated Model to ${currentSettings.model}</strong></p></div>`;
    }
    else if (Object.entries(modelAliases).find(([key, val]) => val === inputModel)) {
      currentSettings.model = modelAliases[Object.keys(modelAliases).find(key => modelAliases[key] === inputModel) || ''];
      messageHtml = `<div class="formattedSettings"><p><strong>Updated Model to ${currentSettings.model}</strong></p></div>`;
    }
     else {
      messageHtml = `<div class="formattedSettings"><p><strong>Model '${inputModel}' does not exist for this API key.</strong></p></div>`;
      new Notice("Invalid model.");
    }

    displayMessage(messageBlock, messageHtml, currentSettings);
    await plugin.saveSettings();
    return currentSettings;
  }
}

// `/list` to list all models.
export async function commandListModels(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
  const messageBlock = createBotMessage(currentSettings);

  // Loop through allModels and create list items
  const modelListItems = currentSettings.allModels.map(model => `<li>${model}</li>`).join('');

  const formattedSettings = 
  `<div class="formattedSettings">
  <h2>Models</h2>
    <ol>${modelListItems}</ol>
  </div>`;

  displayMessage(messageBlock, formattedSettings, currentSettings);
}


// `/ref` to turn on/off referenceCurrentNote.
export async function commandReference(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
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
  await plugin.saveSettings();
}

// `/temp "VALUE"` to change the temperature.
export async function commandTemperature(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
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
  await plugin.saveSettings();
}

// `/maxtokens` to change max_tokens.
export async function commandMaxTokens(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
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
  await plugin.saveSettings();
}

// `/system "[VALUE]"` to change system prompt
export async function commandSystem(input: string, currentSettings: BMOSettings, plugin: BMOGPT) {
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
  await plugin.saveSettings();
}

export async function commandAppend(currentSettings: BMOSettings) {
  let markdownContent = '';

  const activeFile = app.workspace.getActiveFile();

  if (activeFile?.extension === 'md') {
    const existingContent = await app.vault.read(activeFile);

    // Retrieve user and chatbot names
    const userNames = document.querySelectorAll('.userName') as NodeListOf<HTMLHeadingElement>;

    let userNameText = 'USER';
    if (userNames.length > 0) {
        const userNameNode = userNames[0];
        Array.from(userNameNode.childNodes).forEach((node) => {
            // Check if the node is a text node and its textContent is not null
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                userNameText = node.textContent.trim().toUpperCase();
            }
        });
    }

    const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
    const chatbotNameText = chatbotNames.length > 0 && chatbotNames[0].textContent ? chatbotNames[0].textContent.toUpperCase() : 'ASSISTANT';

    // Check and read the JSON file
    if (await this.app.vault.adapter.exists(filenameMessageHistoryJSON)) {
      try {
        const jsonContent = await this.app.vault.adapter.read(filenameMessageHistoryJSON);
        const messages = JSON.parse(jsonContent);

        // Filter out messages starting with '/', and the assistant's response immediately following it
        let skipNext = false;
        markdownContent += messages
          .filter((message: { role: string; content: string; }, index: number, array: string | any[]) => {
            if (skipNext && message.role === 'assistant') {
              skipNext = false;
              return false;
            }
            if (message.content.startsWith('/')) {
              // Check if next message is also from user and starts with '/'
              skipNext = index + 1 < array.length && array[index + 1].role === 'assistant';
              return false;
            }
            return true;
          })
          .map((message: { role: string; content: string; }) => {
            let roleText = message.role.toUpperCase();
            roleText = roleText === 'USER' ? userNameText : roleText;
            roleText = roleText === 'ASSISTANT' ? chatbotNameText : roleText;
            return `###### ${roleText}\n${message.content}\n`;
          })
          .join('\n');

      } catch (error) {
        console.error("Error processing message history:", error);
      }
    }
    
    const updatedContent = existingContent + '\n' + markdownContent;

    // Save the updated content back to the active file
    await app.vault.modify(activeFile, updatedContent);
    new Notice("Appended conversation.");
  }
  else {
    new Notice("No active Markdown file detected.");
  }
}


// `/save` to save current chat history to a note.
export async function commandSave(currentSettings: BMOSettings) {
  let folderName = currentSettings.chatHistoryPath;
  const baseFileName = 'Chat History';
  const fileExtension = '.md';

  if (folderName && !folderName.endsWith('/')) {
    folderName += '/';
  }
  
  // Create a datetime string to append to the file name
  const now = new Date();
  const dateTimeStamp = now.getFullYear() + "-" 
                        + (now.getMonth() + 1).toString().padStart(2, '0') + "-" 
                        + now.getDate().toString().padStart(2, '0') + " " 
                        + now.getHours().toString().padStart(2, '0') + "-" 
                        + now.getMinutes().toString().padStart(2, '0') + "-" 
                        + now.getSeconds().toString().padStart(2, '0');

  try {
    let markdownContent = '';
    const allFiles = app.vault.getFiles(); // Retrieve all files from the vault

    // Retrieve model name
    const modelNameElement = document.querySelector('#modelName') as HTMLHeadingElement;
    let modelName = 'Unknown'; // Default model name
    if (modelNameElement && modelNameElement.textContent) {
        modelName = modelNameElement.textContent.replace('Model: ', '').toUpperCase();
    }

    const templateFile = allFiles.find(file => file.path.toLowerCase() === currentSettings.templateFilePath.toLowerCase());

    if (templateFile) {
      let fileContent = await app.vault.read(templateFile);
  
      // Check if the file content has YAML front matter
      if (/^---\s*[\s\S]*?---/.test(fileContent)) {
          // Insert model name into existing front matter
          fileContent = fileContent.replace(/^---/, `---\nmodel: ${modelName}`);
      } else {
          // Prepend new front matter
          fileContent = `---
  model: ${modelName}
---\n` + fileContent;
      }
      markdownContent += fileContent;
      // console.log(fileContent);
  } else {
      // YAML front matter
      markdownContent += 
      `---
  model: ${modelName}
---\n`;
  }

    // Retrieve user and chatbot names
    const userNames = document.querySelectorAll('.userName') as NodeListOf<HTMLHeadingElement>;

    let userNameText = 'USER';
    if (userNames.length > 0) {
        const userNameNode = userNames[0];
        Array.from(userNameNode.childNodes).forEach((node) => {
            // Check if the node is a text node and its textContent is not null
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                userNameText = node.textContent.trim().toUpperCase();
            }
        });
    }

    // const chatbotNames = document.querySelectorAll('#chatbotName') as NodeListOf<HTMLHeadingElement>;
    const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
    const chatbotNameText = chatbotNames.length > 0 && chatbotNames[0].textContent ? chatbotNames[0].textContent.toUpperCase() : 'ASSISTANT';

    // Check and read the JSON file
    if (await this.app.vault.adapter.exists(filenameMessageHistoryJSON)) {
      try {
        const jsonContent = await this.app.vault.adapter.read(filenameMessageHistoryJSON);
        const messages = JSON.parse(jsonContent);

        // Filter out messages starting with '/', and the assistant's response immediately following it
        let skipNext = false;
        markdownContent += messages
          .filter((message: { role: string; content: string; }, index: number, array: string | any[]) => {
            if (skipNext && message.role === 'assistant') {
              skipNext = false;
              return false;
            }
            if (message.content.startsWith('/')) {
              // Check if next message is also from user and starts with '/'
              skipNext = index + 1 < array.length && array[index + 1].role === 'assistant';
              return false;
            }
            return true;
          })
          .map((message: { role: string; content: string; }) => {
            let roleText = message.role.toUpperCase();
            roleText = roleText === 'USER' ? userNameText : roleText;
            roleText = roleText === 'ASSISTANT' ? chatbotNameText : roleText;
            return `###### ${roleText}\n${message.content}\n`;
          })
          .join('\n');

      } catch (error) {
        console.error("Error processing message history:", error);
      }
    }

    // Check if the folder exists, create it if not
    if (!await this.app.vault.adapter.exists(folderName)) {
      await this.app.vault.createFolder(folderName);
    }

    let fileName = '';

    if (currentSettings.allowRenameNoteTitle) {
      let referenceCurrentNote = '';
      let uniqueNameFound = false;
      let modelRenameTitle;

      const activeFile = this.app.workspace.getActiveFile();

      if (activeFile) {
          if (currentSettings.referenceCurrentNote) {
              referenceCurrentNote = await getActiveFileContent(activeFile);
          }
      }

      // Function to check if a file name already exists
      const fileNameExists = (name: string | null) => {
          return allFiles.some((file) => file.path === folderName + name + fileExtension);
      };
    
      while (!uniqueNameFound) {
          modelRenameTitle = await fetchModelRenameTitle(currentSettings, referenceCurrentNote + markdownContent);
      
          if (!fileNameExists(modelRenameTitle)) {
              uniqueNameFound = true;
          }
      }

      fileName = folderName + modelRenameTitle + fileExtension;
      
    }
    else {
      fileName = folderName + baseFileName + ' ' + dateTimeStamp + fileExtension;
    }

    // Create the new note with formatted Markdown content
    const file = await this.app.vault.create(fileName, markdownContent);
    if (file) {
      // console.log('Note created: ' + file.path);
      new Notice("Saved conversation.");

      // Open the newly created note in a new pane
      this.app.workspace.openLinkText(fileName, '', true, { active: true });
    }
  } catch (error) {
    console.error('Failed to create note:', error);
  }
}

// `/stop` to stop fetching response
export function commandStop() {
  const controller = getAbortController();
  if (controller) {
      controller.abort();
  }
}