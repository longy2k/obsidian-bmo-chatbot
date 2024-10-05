import { Modal, Notice, TFile } from 'obsidian';
import { BMOSettings, DEFAULT_SETTINGS, updateSettingsFromFrontMatter } from '../../main';
import { colorToHex } from '../../utils/ColorConverter';
import { fileNameMessageHistoryJson, messageHistory } from '../../view';
import BMOGPT from '../../main';
import { getAbortController } from '../FetchModelResponse';
import { fetchModelRenameTitle } from '../editor/FetchRenameNoteTitle';
import { displayCommandBotMessage } from './BotMessage';
import { addMessage } from './Message';
// Define handler function signatures
type CommandHandler = (input: string, settings: BMOSettings, plugin: BMOGPT) => void | Promise<void>;

export let lastLoadedChatHistoryFile: TFile | null = null;

// Define the command map with explicit typing
export const commandMap: Record<string, CommandHandler> = {
  '/help': (input, settings, plugin) => commandHelp(plugin, settings),
  '/model': (input, settings, plugin) => commandModel(input, settings, plugin),
  '/profile': (input, settings, plugin) => commandProfile(input, settings, plugin),
  '/prompt': (input, settings, plugin) => commandPrompt(input, settings, plugin),
  '/reference': (input, settings, plugin) => commandReference(input, settings, plugin),
  '/temperature': (input, settings, plugin) => commandTemperature(input, settings, plugin),
  '/maxtokens': (input, settings, plugin) => commandMaxTokens(input, settings, plugin),
  '/append': (input, settings, plugin) => commandAppend(plugin, settings),
  '/save': (input, settings, plugin) => commandSave(plugin, settings),
  '/load': (input, settings, plugin) => commandLoad(input, plugin, settings),
  '/clear': (input, settings, plugin) => removeMessageThread(plugin, 0),
  '/stop': (input, settings, plugin) => commandStop()
};

// Populate commandMap with aliases for cleaner access
export const aliases: Record<string, string[]> = {
  '/help': ['/h', '/man', '/manual', '/commands'],
  '/model': ['/m', '/models'],
  '/profile': ['/p', '/prof', '/profiles'],
  '/prompt': ['/prompts'],
  '/reference': ['/ref'],
  '/temperature': ['/temp', ''],
  '/clear': ['/c'],
  '/stop': ['/s']
};

Object.entries(aliases).forEach(([command, aliasList]) => {
  aliasList.forEach(alias => commandMap[alias] = commandMap[command]);
});

// Command execution function with correct typing
export function executeCommand(input: string, settings: BMOSettings, plugin: BMOGPT): void | Promise<void> {
  const command = input.split(' ')[0];
  const handler = commandMap[command] || (() => commandFalse());
  return handler(input, settings, plugin);
}


// Function to create and append a bot message
export function createBotMessage(settings: BMOSettings): HTMLDivElement {
  const messageContainer = document.querySelector('#messageContainer');
  const botMessage = document.createElement('div');
  botMessage.classList.add('botMessage');
  botMessage.style.backgroundColor = colorToHex(
    settings.appearance.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim()
  );
  messageContainer?.appendChild(botMessage);

  const botNameSpan = document.createElement('span');
  botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
  botNameSpan.className = 'chatbotName';
  botMessage.appendChild(botNameSpan);

  const messageBlock = document.createElement('div');
  messageBlock.classList.add('messageBlock');
  botMessage.appendChild(messageBlock);

  return messageBlock;
}

export async function commandFalse() {
  new Notice('Command not recognized. Type `/help` for commands.');

  const chatbox = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;

  chatbox.value = '';
}

// =================== COMMAND FUNCTIONS ===================

// `/help` for help commands
export function commandHelp(plugin: BMOGPT, settings: BMOSettings) {
  const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
  const botMessageDiv = document.createElement('div');
  botMessageDiv.className = 'botMessage';
  botMessageDiv.style.backgroundColor = colorToHex(settings.appearance.botMessageBackgroundColor ||
      getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim());

  const botMessageToolBarDiv = document.createElement('div');
  botMessageToolBarDiv.className = 'botMessageToolBar';

  const botNameSpan = document.createElement('span'); 
  botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
  botNameSpan.className = 'chatbotName';

  const messageBlockDiv = document.createElement('div');
  messageBlockDiv.className = 'messageBlock';

  const displayCommandBotMessageDiv = document.createElement('div');
  displayCommandBotMessageDiv.className = 'commandBotMessage';

  const header = document.createElement('h3');
  header.textContent = 'Manual';
  header.style.textAlign = 'center';
  displayCommandBotMessageDiv.appendChild(header);

  const generalCommandHeader = document.createElement('h4');
  generalCommandHeader.textContent = 'General Commands';
  generalCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(generalCommandHeader);

  const commandClearP = document.createElement('p');
  commandClearP.innerHTML = '<code>/clear</code> or <code>/c</code> - Clear chat history.';
  displayCommandBotMessageDiv.appendChild(commandClearP);

  const commandRefOnP = document.createElement('p');
  commandRefOnP.innerHTML = '<code>/ref on</code> - Turn on "reference current note".';
  displayCommandBotMessageDiv.appendChild(commandRefOnP);

  const commandRefOffP = document.createElement('p');
  commandRefOffP.innerHTML = '<code>/ref off</code> - Turn off "reference current note".';
  displayCommandBotMessageDiv.appendChild(commandRefOffP);

  const commandMaxTokensP = document.createElement('p');
  commandMaxTokensP.innerHTML = '<code>/maxtokens [VALUE]</code> - Set max tokens.';
  displayCommandBotMessageDiv.appendChild(commandMaxTokensP);

  const commandTempP = document.createElement('p');
  commandTempP.innerHTML = '<code>/temp [VALUE]</code> - Change temperature range from 0 to 2.';
  displayCommandBotMessageDiv.appendChild(commandTempP);

  const profileCommandHeader = document.createElement('h4');
  profileCommandHeader.textContent = 'Profile Commands';
  profileCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(profileCommandHeader);

  const commandProfileListP = document.createElement('p');
  commandProfileListP.innerHTML = '<code>/profile</code> - List profile.';
  displayCommandBotMessageDiv.appendChild(commandProfileListP);

  const commandProfileChangeP = document.createElement('p');
  commandProfileChangeP.innerHTML = '<code>/profile [PROFILE-NAME] or [VALUE]</code> - Change profile.';
  displayCommandBotMessageDiv.appendChild(commandProfileChangeP);

  const modelCommandHeader = document.createElement('h4');
  modelCommandHeader.textContent = 'Model Commands';
  modelCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(modelCommandHeader);

  const commandModelListP = document.createElement('p');
  commandModelListP.innerHTML = '<code>/model</code> - List model.';
  displayCommandBotMessageDiv.appendChild(commandModelListP);

  const commandModelChangeP = document.createElement('p');
  commandModelChangeP.innerHTML = '<code>/model [MODEL-NAME] or [VALUE]</code> - Change model.';
  displayCommandBotMessageDiv.appendChild(commandModelChangeP);

  const promptCommandHeader = document.createElement('h4');
  promptCommandHeader.textContent = 'Prompt Commands';
  promptCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(promptCommandHeader);

  const commandPromptListP = document.createElement('p');
  commandPromptListP.innerHTML = '<code>/prompt</code> - List prompts.';
  displayCommandBotMessageDiv.appendChild(commandPromptListP);

  const commandPromptChangeP = document.createElement('p');
  commandPromptChangeP.innerHTML = '<code>/prompt [PROMPT-NAME] or [VALUE]</code> - Change prompts.';
  displayCommandBotMessageDiv.appendChild(commandPromptChangeP);

  const commandPromptClearP = document.createElement('p');
  commandPromptClearP.innerHTML = '<code>/prompt clear</code> - Clear prompt.';
  displayCommandBotMessageDiv.appendChild(commandPromptClearP);

  const editorCommandHeader = document.createElement('h4');
  editorCommandHeader.textContent = 'Editor Commands';
  editorCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(editorCommandHeader);

  const commandAppendP = document.createElement('p');
  commandAppendP.innerHTML = '<code>/append</code> - Append current chat history to current active note.';
  displayCommandBotMessageDiv.appendChild(commandAppendP);

  const commandSaveP = document.createElement('p');
  commandSaveP.innerHTML = '<code>/save</code> - Save current chat history to a note.';
  displayCommandBotMessageDiv.appendChild(commandSaveP);

  const commandLoadP = document.createElement('p');
  commandLoadP.innerHTML = '<code>/load</code> - List or load a chat history into view.';
  displayCommandBotMessageDiv.appendChild(commandLoadP);

  const streamCommandHeader = document.createElement('h4');
  streamCommandHeader.textContent = 'Response Commands';
  streamCommandHeader.style.textAlign = 'left';
  displayCommandBotMessageDiv.appendChild(streamCommandHeader);

  const commandStopP = document.createElement('p');
  commandStopP.innerHTML = '<code>/stop</code> or <code>/s</code> - Stop fetching response. Warning: Anthropric models cannot be aborted. Please use with caution.';
  displayCommandBotMessageDiv.appendChild(commandStopP);

  messageBlockDiv.appendChild(displayCommandBotMessageDiv);
  botMessageToolBarDiv.appendChild(botNameSpan);
  botMessageDiv.appendChild(botMessageToolBarDiv);
  botMessageDiv.appendChild(messageBlockDiv);

  const index = messageHistory.length - 1;

  addMessage(plugin, messageBlockDiv.innerHTML, 'botMessage', settings, index);

  messageContainer.appendChild(botMessageDiv);
}

// `/model "[VALUE]"` to change model.
export async function commandModel(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;

    // Get models as arrays
    const ollamaModels = settings.OllamaConnection.ollamaModels.map(model => model);
    const RESTAPIModels = settings.RESTAPIURLConnection.RESTAPIURLModels.map(model => model);
    const anthropicModels = settings.APIConnections.anthropic.anthropicModels.map(model => model);
    const googleGeminiModels = settings.APIConnections.googleGemini.geminiModels.map(model => model);
    const mistralModels = settings.APIConnections.mistral.mistralModels.map(model => model);
    const openAIBaseModels = settings.APIConnections.openAI.openAIBaseModels.map(model => model);
	const azureOpenAIModels = settings.APIConnections.azureOpenAI.azureOpenAIBaseModels.map(model => model)
    const openRouterModels = settings.APIConnections.openRouter.openRouterModels.map(model => model);

    // Combine all models
    const allModels = [
      ...settings.OllamaConnection.ollamaModels,
      ...settings.RESTAPIURLConnection.RESTAPIURLModels,
      ...settings.APIConnections.anthropic.anthropicModels,
      ...settings.APIConnections.googleGemini.geminiModels,
      ...settings.APIConnections.mistral.mistralModels,
      ...settings.APIConnections.openAI.openAIBaseModels,
      ...settings.APIConnections.azureOpenAI.azureOpenAIBaseModels,
      ...settings.APIConnections.openRouter.openRouterModels
  ];
  
  // Check if the user has not specified a model after the "/model" command
  if (!input.split(' ')[1]) {

    let currentModel = settings.general.model;

    // Check if currentModel is empty, and set it to "Empty" if it is
    if (!currentModel) {
      currentModel = 'Empty';
    }

    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'botMessage';
    botMessageDiv.style.backgroundColor = colorToHex(settings.appearance.botMessageBackgroundColor ||
        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim());

    const botMessageToolBarDiv = document.createElement('div');
    botMessageToolBarDiv.className = 'botMessageToolBar';

    const botNameSpan = document.createElement('span'); 
    botNameSpan.textContent = settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName;
    botNameSpan.className = 'chatbotName';

    const messageBlockDiv = document.createElement('div');
    messageBlockDiv.className = 'messageBlock';

    const displayCommandBotMessageDiv = document.createElement('div');
    displayCommandBotMessageDiv.className = 'commandBotMessage';

    const header = document.createElement('h3');
    header.textContent = 'Model List';
    header.style.textAlign = 'center';
    displayCommandBotMessageDiv.appendChild(header);

    const currentModelP = document.createElement('p');
    currentModelP.innerHTML = `<b>Current Model:</b> ${currentModel}`;
    currentModelP.style.textAlign = 'center';
    displayCommandBotMessageDiv.appendChild(currentModelP);

    const apiLists = [
      { header: 'Ollama Models', items: ollamaModels },
      { header: 'REST API Models', items: RESTAPIModels },
      { header: 'Anthropic Models', items: anthropicModels},
      { header: 'Google Gemini Models', items: googleGeminiModels },
      { header: 'Mistral Models', items: mistralModels },
      { header: 'OpenAI-Based Models', items: openAIBaseModels },
      { header: "Azure OpenAI Models", items: azureOpenAIModels },
      { header: 'OpenRouter Models', items: openRouterModels }
    ];
    
    let currentStartIndex = 1;
    
    apiLists.forEach(api => {
      if (Array.isArray(api.items) && api.items.length) {
        const header = document.createElement('h4');
        header.textContent = api.header;
        displayCommandBotMessageDiv.appendChild(header);
    
        const list = document.createElement('ol');
        list.setAttribute('start', String(currentStartIndex));
    
        api.items.forEach(item => {
          const listItem = document.createElement('li');
          listItem.textContent = item;
          list.appendChild(listItem);
        });
    
        displayCommandBotMessageDiv.appendChild(list);
    
        // Update the currentStartIndex based on the number of items in the list
        currentStartIndex += api.items.length;
      }
    });
    
    

    messageBlockDiv.appendChild(displayCommandBotMessageDiv);
    botMessageToolBarDiv.appendChild(botNameSpan);
    botMessageDiv.appendChild(botMessageToolBarDiv);
    botMessageDiv.appendChild(messageBlockDiv);

    const index = messageHistory.length - 1;

    addMessage(plugin, messageBlockDiv.innerHTML, 'botMessage', settings, index);

    messageContainer.appendChild(botMessageDiv);
  }

  // Check if the user has specified a model after the "/model" command
  if (input.split(' ')[1] !== undefined) {
    const inputModel = input.split(' ')[1].replace(/^"(.*)"$/, '$1');

    const modelAliases: { [key: string]: string } = {};

    for (let i = 1; i <= allModels.length; i++) {
      const model = allModels[i - 1];
      modelAliases[i] = model;
    }

    if (Object.entries(modelAliases).find(([key, val]) => key === inputModel)){
      settings.general.model = modelAliases[inputModel];
      new Notice(`Updated model to ${settings.general.model}`);
    }
    else if (Object.entries(modelAliases).find(([key, val]) => val === inputModel)) {
      settings.general.model = modelAliases[Object.keys(modelAliases).find(key => modelAliases[key] === inputModel) || ''];
      new Notice(`Updated model to ${settings.general.model}`);
    }
    else {
      new Notice('Invalid model.');
    }

    await plugin.saveSettings();
  }
}

// `/profile "[VALUE]"` to change profile.
export async function commandProfile(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;

  if (!settings.profiles.profileFolderPath) {
    new Notice('Profile folder path not set.');
    const commandBotMessage = '<p>Profile folder path not set.</p>';

    const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
    messageContainer.appendChild(botMessageDiv);
    return;
  }

  // Fetching files from the specified folder
  const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));

  // Sorting the files array alphabetically by file name
  files.sort((a, b) => a.name.localeCompare(b.name));

  let currentProfile = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension

  // Check if the user has not specified a profile
  if (!input.split(' ')[1]) {

    // Loop through files and create list items, removing the file extension
    const fileListItems = files.map(file => {
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, ''); // Removing the last dot and what follows
      return `<li>${fileNameWithoutExtension}</li>`;
    }).join('');

    // Check if currentProfile is empty, and set it to "Empty" if it is
    if (!currentProfile) {
      currentProfile = 'Empty';
    }

    const commandBotMessage = 
    `<h2 style="text-align: center;">Profiles</h2>
      <p style="text-align: center;"><b>Current profile:</b> ${currentProfile}</p>
      <ol>${fileListItems}</ol>`;

    const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
    messageContainer.appendChild(botMessageDiv);

    return;
  }

  // Check if the user has specified a profile
  if (input.startsWith('/p') || 
      input.startsWith('/prof') || 
      input.startsWith('/profile') || 
      input.startsWith('/profiles')) {
    let inputValue = input.split(' ').slice(1).join(' ').trim();

    // Remove quotation marks if present
    if ((inputValue.startsWith('"') && inputValue.endsWith('"')) ||
        (inputValue.startsWith('\'') && inputValue.endsWith('\''))) {
      inputValue = inputValue.substring(1, inputValue.length - 1);
    }
    
    const profileAliases: { [key: string]: string } = {};
    
    // Create aliases for each file (profile)
    for (let i = 1; i <= files.length; i++) {
      const fileNameWithoutExtension = files[i - 1].name.replace(/\.[^/.]+$/, '');
      profileAliases[i.toString().toLowerCase()] = fileNameWithoutExtension;
    }

    if (profileAliases[inputValue]) {
      // If input matches a key in profileAliases
      plugin.settings.profiles.profile = profileAliases[inputValue] + '.md';
      const profileFilePath = plugin.settings.profiles.profileFolderPath + '/' + profileAliases[inputValue] + '.md';
      const currentProfile = plugin.app.vault.getAbstractFileByPath(profileFilePath) as TFile;

      const currentProfileName = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
  
      // Finding the index of the currentProfile in the profileFiles array
      const profileIndex = files.findIndex((file) => file.basename === currentProfileName);

      settings.profiles.lastLoadedChatHistoryPath = settings.profiles.lastLoadedChatHistory[profileIndex];

      // new Notice(`Profile updated to '${profileAliases[inputValue]}'`);
      plugin.activateView();
      await updateSettingsFromFrontMatter(plugin, currentProfile);
      await plugin.saveSettings();
    } else if (Object.values(profileAliases).map(v => v.toLowerCase()).includes(inputValue.toLowerCase())) {
        // If input matches a value in profileAliases (case-insensitive)
        const matchedProfile = Object.entries(profileAliases).find(([key, value]) => value.toLowerCase() === inputValue.toLowerCase());
        if (matchedProfile) {
            plugin.settings.profiles.profile = matchedProfile[1] + '.md';
            const profileFilePath = plugin.settings.profiles.profileFolderPath + '/' + matchedProfile[1] + '.md';
            const currentProfile = plugin.app.vault.getAbstractFileByPath(profileFilePath) as TFile;

            const currentProfileName = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
  
            // Finding the index of the currentProfile in the profileFiles array
            const profileIndex = files.findIndex((file) => file.basename === currentProfileName);
      
            settings.profiles.lastLoadedChatHistoryPath = settings.profiles.lastLoadedChatHistory[profileIndex];
            
            plugin.activateView();
            await updateSettingsFromFrontMatter(plugin, currentProfile);
            await plugin.saveSettings();
        }
    } else {
        new Notice('Invalid profile.');
    }

    await plugin.saveSettings();
  }

}

// `/prompt "[VALUE]"` to change prompt.
export async function commandPrompt(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;

  if (!settings.prompts.promptFolderPath) {
    new Notice('Prompt folder path not set.');
    const commandBotMessage = '<p>Prompt folder path not set.</p>';

    const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
    messageContainer.appendChild(botMessageDiv);
    return;
  }

  // Fetching files from the specified folder
  const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.prompts.promptFolderPath));

  // Sorting the files array alphabetically by file name
  files.sort((a, b) => a.name.localeCompare(b.name));

  // Check if the user has not specified a prompt after the "/prompt" command
  if (!input.split(' ')[1]) {

    // Loop through files and create list items, removing the file extension
    const fileListItems = files.map(file => {
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, ''); // Removing the last dot and what follows
      return `<li>${fileNameWithoutExtension}</li>`;
    }).join('');

    let currentPrompt = settings.prompts.prompt;

    // Check if currentPrompt is empty, and set it to "Empty" if it is
    if (!currentPrompt) {
      currentPrompt = 'Empty';
    }

    const commandBotMessage = 
    `<h2 style="text-align: center;">Prompts</h2>
      <p style="text-align: center;"><b>Current prompt:</b> ${currentPrompt.replace('.md', '') }</p>
      <ol>${fileListItems}</ol>`;

    const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
    messageContainer.appendChild(botMessageDiv);

    return;
  }

  // Check if the user has specified a prompt after the "/prompt" command
  if (input.startsWith('/prompt')) {
    let inputValue = input.split(' ').slice(1).join(' ').trim();

    // Remove quotation marks if present
    if ((inputValue.startsWith('"') && inputValue.endsWith('"')) ||
        (inputValue.startsWith('\'') && inputValue.endsWith('\''))) {
      inputValue = inputValue.substring(1, inputValue.length - 1);
    }

    // Set to default or empty if the input is 'clear' or 'c'
    if (inputValue === 'clear' || inputValue === 'c') {
      settings.prompts.prompt = ''; // Set to default or empty
      new Notice('Prompt cleared.');

      await plugin.saveSettings();
    }
    
    const promptAliases: { [key: string]: string } = {};
    
    // Create aliases for each file (prompt)
    for (let i = 1; i <= files.length; i++) {
      const fileNameWithoutExtension = files[i - 1].name.replace(/\.[^/.]+$/, '');
      promptAliases[i.toString()] = fileNameWithoutExtension;
    }
  

    let currentModel;
    if (promptAliases[inputValue]) {
      // If input matches a key in promptAliases
      settings.prompts.prompt = promptAliases[inputValue] + '.md';
      currentModel = settings.prompts.prompt.replace(/\.[^/.]+$/, ''); // Removing the file extension
      new Notice(`Prompt updated to '${currentModel}'`);
    } else if (Object.values(promptAliases).map(v => v.toLowerCase()).includes(inputValue.toLowerCase())) {
      // If input matches a value in profileAliases (case-insensitive)
      const matchedProfile = Object.entries(promptAliases).find(([key, value]) => value.toLowerCase() === inputValue.toLowerCase());
      if (matchedProfile) {
        settings.prompts.prompt = matchedProfile[1] + '.md';
        currentModel = settings.prompts.prompt.replace(/\.[^/.]+$/, ''); // Removing the file extension
        new Notice(`Prompt updated to '${currentModel}'`);
      }
    } else {
      if (inputValue !== 'clear' && inputValue !== 'c') {
        new Notice('Invalid prompt.');
      }
    }

    await plugin.saveSettings();
  }

}

// `/ref` to turn on/off referenceCurrentNote.
export async function commandReference(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
  const inputValue = input.split(' ')[1]?.toLowerCase();

  if (inputValue === 'true' || inputValue === 'on') {
    settings.general.enableReferenceCurrentNote = true;
      if (referenceCurrentNoteElement) {
          referenceCurrentNoteElement.style.display = 'block';
      }
      new Notice('Reference current note: on.');
  } else if (inputValue === 'false' || inputValue === 'off') {
    settings.general.enableReferenceCurrentNote = false;
      if (referenceCurrentNoteElement) {
          referenceCurrentNoteElement.style.display = 'none';
      }
      new Notice ('Reference current note: off.');
  } else {
    new Notice('Type `/ref on` or `/ref off` to turn on/off reference current note.');
  }

  await plugin.saveSettings();
}

// `/temp "VALUE"` to change the temperature.
export async function commandTemperature(input: string, settings: BMOSettings, plugin: BMOGPT) {
  const inputValue = input.split(' ')[1];
  const floatValue = parseFloat(inputValue);

  if (settings && !isNaN(floatValue)) {
    if (floatValue < 0.00) {
      settings.general.temperature = '0.00';
    } else if (floatValue > 2.00) {
      settings.general.temperature = '2.00';
    } else {
      settings.general.temperature = floatValue.toFixed(2);
    }
    new Notice(`Temperature updated: ${settings.general.temperature}`);
  } else {
    new Notice(`Current temperature: ${settings.general.temperature}`);
  }

  await plugin.saveSettings();
}

// `/maxtokens` to change max_tokens.
export async function commandMaxTokens(input: string, settings: BMOSettings, plugin: BMOGPT) {
  // let commandBotMessage = '';
  const commandParts = input.split(' ');
  const commandAction = commandParts[1] ? commandParts[1].toLowerCase() : '';
  // let maxTokensSettingMessage: string;

  // Check for clear command first
  if (commandAction === 'c' || commandAction === 'clear') {
    settings.general.max_tokens = '';
    new Notice('Max tokens cleared.');
  } else if (commandAction !== '') {
    const inputValue = parseInt(commandAction);

    if (!isNaN(inputValue) && inputValue >= 0) {
      // Update max_tokens with the valid integer value
      settings.general.max_tokens = inputValue.toString();
      new Notice(`Max tokens updated: ${inputValue}`);
    } else {
      // Input is not a valid integer or is negative
      new Notice('Max tokens update: invalid');
    }
  } else {
    // No action specified
    if (settings.general.max_tokens === '') {
      new Notice('Current max tokens: Empty');
    } else {
      new Notice(`Current max tokens: ${settings.general.max_tokens}`);
    }
  }

  await plugin.saveSettings();
}

// `/append` to append current chat history to current active note.
export async function commandAppend(plugin: BMOGPT, settings: BMOSettings) {
  let markdownContent = '';

  const activeFile = plugin.app.workspace.getActiveFile();

  if (activeFile?.extension === 'md') {
    const existingContent = await plugin.app.vault.read(activeFile);

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
    if (await this.app.vault.adapter.exists(fileNameMessageHistoryJson(plugin))) {
      try {
        const jsonContent = await this.app.vault.adapter.read(fileNameMessageHistoryJson(plugin));
        const messages = JSON.parse(jsonContent);

        // Filter out messages starting with '/', and the assistant's response immediately following it
        let skipNext = false;
        markdownContent += messages
        .filter((messageHistory: { role: string; content: string; }, index: number, array: { role: string; content: string; }[]) => {
          if (skipNext && messageHistory.role === 'assistant') {
            skipNext = false;
            return false;
          }
          if (messageHistory.content.startsWith('/') || messageHistory.content.includes('errorBotMessage')) {
            // Check if next message is also from user and starts with '/' or if current assistant message contains "displayErrorBotMessage"
            skipNext = (index + 1 < array.length && array[index + 1].role === 'assistant') || messageHistory.role === 'assistant';
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
        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
        console.error('Error processing message history:', error);
      }
    }
    
    const updatedContent = existingContent + '\n' + markdownContent;

    // Save the updated content back to the active file
    await plugin.app.vault.modify(activeFile, updatedContent);
    new Notice('Appended conversation.');
  }
  else {
    new Notice('No active Markdown file detected.');
  }
}


// `/save` to save current chat history to a note.
export async function commandSave(plugin: BMOGPT, settings: BMOSettings) {
  new Notice('Saving conversation...')

  let folderName = settings.chatHistory.chatHistoryPath;
  // Check if the folder exists, create it if not
  if (!await plugin.app.vault.adapter.exists(folderName)) {
    await plugin.app.vault.createFolder(folderName);
  }
  const baseFileName = 'Chat History';
  const fileExtension = '.md';

  if (folderName && !folderName.endsWith('/')) {
    folderName += '/';
  }
  
  // Create a datetime string to append to the file name
  const now = new Date();
  const dateTimeStamp = now.getFullYear() + '-' 
                        + (now.getMonth() + 1).toString().padStart(2, '0') + '-' 
                        + now.getDate().toString().padStart(2, '0') + ' ' 
                        + now.getHours().toString().padStart(2, '0') + '-' 
                        + now.getMinutes().toString().padStart(2, '0') + '-' 
                        + now.getSeconds().toString().padStart(2, '0');

  try {
    let markdownContent = '';
    const allFiles = plugin.app.vault.getFiles(); // Retrieve all files from the vault

    const templateFile = allFiles.find(file => file.path.toLowerCase() === settings.chatHistory.templateFilePath.toLowerCase());

    if (templateFile) {
      let fileContent = await plugin.app.vault.read(templateFile);
  
      // Check if the file content has YAML front matter
      if (/^---\s*[\s\S]*?---/.test(fileContent)) {
        // Check if the model property already exists in the front matter
        if (!/^model:\s/m.test(fileContent)) {
          // Insert model name into existing front matter if it doesn't exist
          fileContent = fileContent.replace(/^---/, `---\nmodel: ${settings.general.model}`);
        }
      } else {
          // Prepend new front matter
          fileContent = `---
  model: ${settings.general.model}
---\n` + fileContent;
      }
      markdownContent += fileContent;
  } else {
      // YAML front matter
      markdownContent += 
      `---
  model: ${settings.general.model}
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

    const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
    const chatbotNameText = chatbotNames.length > 0 && chatbotNames[0].textContent ? chatbotNames[0].textContent.toUpperCase() : 'ASSISTANT';

    // Check and read the JSON file
    if (await plugin.app.vault.adapter.exists(fileNameMessageHistoryJson(plugin))) {
      try {
        const jsonContent = await plugin.app.vault.adapter.read(fileNameMessageHistoryJson(plugin));
        const messages = JSON.parse(jsonContent);

        // Filter out messages starting with '/', and the assistant's response immediately following it
        let skipNext = false;
        markdownContent += messages
        .filter((messageHistory: { role: string; content: string; }, index: number, array: { role: string; content: string; }[]) => {
          if (skipNext && messageHistory.role === 'assistant') {
            skipNext = false;
            return false;
          }
          if (messageHistory.content.startsWith('/') || messageHistory.content.includes('errorBotMessage')) {
            // Check if next message is also from user and starts with '/' or if current assistant message contains "displayErrorBotMessage"
            skipNext = (index + 1 < array.length && array[index + 1].role === 'assistant') || messageHistory.role === 'assistant';
            return false;
          }
          return true;
        })
        .map((message: { role: string; content: string; }) => {
          let roleText = message.role.toUpperCase();
          roleText = roleText === 'USER' ? userNameText : roleText;
          roleText = roleText === 'ASSISTANT' ? chatbotNameText : roleText;

          // Remove the rendered block from the message content
          const regexRenderedBlock = /<block-rendered>[\s\S]*?<\/block-rendered>/g;
          message.content = message.content.replace(regexRenderedBlock, '').trim();

          // Remove rendered note tags from the message content
          const regexRenderedNote = /<note-rendered>[\s\S]*?<\/note-rendered>/g;
          message.content = message.content.replace(regexRenderedNote, '').trim();


          return `###### ${roleText}\n${message.content}\n`;
        })
        .join('\n');
      } catch (error) {
        // const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        // const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, error);
        // messageContainer.appendChild(botMessageDiv);
        console.error('Error processing message history:', error);
      }
    }

    let fileName = '';

    if (settings.chatHistory.allowRenameNoteTitle) {
      let uniqueNameFound = false;
      let modelRenameTitle;

      // Function to check if a file name already exists
      const fileNameExists = (name: string | null) => {
          return allFiles.some((file) => file.path === folderName + name + fileExtension);
      };
    
      while (!uniqueNameFound) {
          modelRenameTitle = await fetchModelRenameTitle(settings,  markdownContent);
      
          if (!fileNameExists(modelRenameTitle)) {
              uniqueNameFound = true;
          }
      }

      fileName = folderName + modelRenameTitle + fileExtension;
      
    }
    else {
      fileName = folderName + baseFileName + ' ' + dateTimeStamp + fileExtension;
    }
  
    // Update if lastLoadedChatHistoryPath is not null
    if (settings.profiles.lastLoadedChatHistoryPath !== null) {
      lastLoadedChatHistoryFile = plugin.app.vault.getAbstractFileByPath(settings.profiles.lastLoadedChatHistoryPath) as TFile;
    }

    if (lastLoadedChatHistoryFile === null) {
        // Create the new note with formatted Markdown content
        const file = await plugin.app.vault.create(fileName, markdownContent);
        // Fetching files from the specified folder (profiles)
        const profileFiles = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(settings.profiles.profileFolderPath));

        // Sorting the files array alphabetically by file name
        profileFiles.sort((a, b) => a.name.localeCompare(b.name));
        const currentProfile = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension
        
        // Finding the index of the currentProfile in the profileFiles array
        const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);
        if (file) {
          settings.profiles.lastLoadedChatHistoryPath = file.path;
          settings.profiles.lastLoadedChatHistory[profileIndex] = file.path;
          // Open the newly created note in a new pane
          plugin.app.workspace.openLinkText(fileName, '', true, { active: true });
        }
    } else {
      // Update the existing note with the formatted Markdown content
      await plugin.app.vault.modify(lastLoadedChatHistoryFile, markdownContent);
      // Get active file
      const activeFile = plugin.app.workspace.getActiveFile();

      // Log the active files to the console
      if (activeFile?.path !== lastLoadedChatHistoryFile.path) {
        plugin.app.workspace.openLinkText(lastLoadedChatHistoryFile.path, lastLoadedChatHistoryFile.path, true, { active: true });
      }
    }
    
    new Notice(`Saved to '${lastLoadedChatHistoryFile?.name}'`);
    await plugin.saveSettings();
  } catch (error) {
    console.error('Failed to create note:', error);
  }
}

// `/load` to load chat history.
export async function commandLoad(input: string, plugin: BMOGPT, settings: BMOSettings) {
  const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
  const folderPath = plugin.settings.chatHistory.chatHistoryPath.trim() || DEFAULT_SETTINGS.chatHistory.chatHistoryPath;      

  // Fetching files from the specified folder
  const files = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(folderPath));

  // Sorting the files array alphabetically by file name
  files.sort((a, b) => a.name.localeCompare(b.name));

  // Fetching files from the specified folder (profiles)
  const profileFiles = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));

  // Sorting the files array alphabetically by file name
  profileFiles.sort((a, b) => a.name.localeCompare(b.name));

  const currentProfile = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension

  // Finding the index of the currentProfile in the profileFiles array
  const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);


// Check if the user has not specified a profile
if (!input.split(' ')[1]) {
  // Group files with the same name and create list items
  const fileGroups: { [key: string]: { count: number } } = files.reduce((acc, file) => {
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
    if (acc[fileNameWithoutExtension]) {
      acc[fileNameWithoutExtension].count++;
    } else {
      acc[fileNameWithoutExtension] = { count: 1 };
    }
    return acc;
  }, {} as { [key: string]: { count: number } });

  const fileListItems = Object.entries(fileGroups)
    .map(([fileName, { count }]) => {
      return count > 1 ? `<li>${fileName} [${count} files found]</li>` : `<li>${fileName}</li>`;
    })
    .join('');

  const commandBotMessage = 
  `<h2 style="text-align: center;">Chat History</h2>
   <p style="text-align: center;"><b>Current Chat History:</b> ${settings.profiles.lastLoadedChatHistory[profileIndex] ? settings.profiles.lastLoadedChatHistory[profileIndex] : 'Empty'}</p>
    <ol>${fileListItems}</ol>`;

  const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
  messageContainer.appendChild(botMessageDiv);

  return;
}

// Check if the user has specified a prompt after the "/prompt" command
if (input.startsWith('/load')) {
  let inputValue = input.split(' ').slice(1).join(' ').trim();

  // Remove quotation marks if present
  if ((inputValue.startsWith('"') && inputValue.endsWith('"')) ||
      (inputValue.startsWith('\'') && inputValue.endsWith('\''))) {
    inputValue = inputValue.substring(1, inputValue.length - 1);
  }

  const loadAliases: { [key: string]: string } = {};
  let currentIndex = 1;
  
  // Create aliases for each file
  for (let i = 0; i < files.length; i++) {
    const fileNameWithoutExtension = files[i].name.replace(/\.[^/.]+$/, '');
  
    // Check if an entry with the same file name already exists
    const existingKey = Object.values(loadAliases).find(
      value => value === fileNameWithoutExtension
    );
  
    if (!existingKey) {
      // Add the entry only if it doesn't exist
      loadAliases[currentIndex.toString().toLowerCase()] = fileNameWithoutExtension;
      currentIndex++;
    }
  }
    const messageHistory: { role: string; content: string }[] = [];

    const loadChatHistory = async (filePath: string): Promise<boolean> => {
      const currentLoad = plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
      const fileContent = await plugin.app.vault.cachedRead(currentLoad);
      const contentWithoutFrontmatter = fileContent.replace(/^---\n[\s\S]*?\n---\n/, '');
    
      const lines = contentWithoutFrontmatter.split('\n');
      let currentRole = '';
      let currentContent = '';
      let headerCount = 0;
    
      for (const line of lines) {
        if (line.startsWith('###### ')) {
          headerCount++;
          if (currentContent) {
            messageHistory.push({
              role: currentRole,
              content: currentContent.trim(),
            });
          }
          currentRole = currentRole === 'user' ? 'assistant' : 'user';
          currentContent = '';
        } else {
          currentContent += line + '\n';
        }
      }
    
      if (currentContent) {
        messageHistory.push({
          role: currentRole,
          content: currentContent.trim(),
        });
      }
    
      if (headerCount % 2 !== 0) {
        new Notice('Incorrect formatting.');
        return false;
      }
    
      const updatedJsonString = JSON.stringify(messageHistory, null, 4);
      await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), updatedJsonString);
      plugin.activateView();
      return true;
    };
    
    if (loadAliases[inputValue]) {    
      const matchingFiles = files.filter(file => file.name.includes(loadAliases[inputValue]));

      // Create modal content
      const modal = new Modal(plugin.app);
      const modalContent = document.createElement('div');
      modalContent.classList.add('modal-content');
    
      const heading = document.createElement('h2');
      heading.textContent = 'Load Chat History';
      modalContent.appendChild(heading);
    
      if (matchingFiles.length === 1) {
        // Display confirmation message for a single file
        const message = document.createElement('p');
        message.textContent = `Are you sure you want to override your current chat history with "${matchingFiles[0].name}"?`;
        modalContent.appendChild(message);
    
        const confirmLoadButton = document.createElement('button');
        confirmLoadButton.id = 'confirmLoad';
        confirmLoadButton.textContent = 'Confirm';
        modalContent.appendChild(confirmLoadButton);
    
        confirmLoadButton?.addEventListener('click', async function () {
          const selectedFile = matchingFiles[0];
          const chatHistoryFilePath = selectedFile.path;
          const success = await loadChatHistory(chatHistoryFilePath);
          if (success) {
            new Notice(`Switched to '${selectedFile.path}' chat history.`);
            lastLoadedChatHistoryFile = selectedFile;

            settings.profiles.lastLoadedChatHistoryPath = selectedFile.path;

            // Update the lastLoadedChatHistoryPath for the current profile
            settings.profiles.lastLoadedChatHistory[profileIndex] = settings.profiles.lastLoadedChatHistoryPath;
            await plugin.saveSettings();
          }
          modal.close();
        });
      } else {
        // Display file options for multiple matching files
        const message = document.createElement('p');
        message.textContent = 'Select a chat history to override:';
        modalContent.appendChild(message);
    
        // Create a container for file options
        const optionsContainer = document.createElement('div');
        optionsContainer.classList.add('file-options');
        optionsContainer.style.marginBottom = '16px';
    
        // Create a radio button and label for each matching file
        matchingFiles.forEach((file, index) => {
          const radioElement = document.createElement('input');
          radioElement.type = 'radio';
          radioElement.name = 'fileOption';
          radioElement.value = file.path;
          radioElement.id = `file-${index}`;
    
          const labelElement = document.createElement('label');
          labelElement.htmlFor = `file-${index}`;
          labelElement.textContent = file.path;
    
          optionsContainer.appendChild(radioElement);
          optionsContainer.appendChild(labelElement);
          optionsContainer.appendChild(document.createElement('br'));
        });
    
        modalContent.appendChild(optionsContainer);
    
        const confirmLoadButton = document.createElement('button');
        confirmLoadButton.id = 'confirmLoad';
        confirmLoadButton.textContent = 'Load';
        modalContent.appendChild(confirmLoadButton);
    
        confirmLoadButton?.addEventListener('click', async function () {
          const selectedRadio = optionsContainer.querySelector('input[type="radio"]:checked') as HTMLInputElement;
          if (selectedRadio) {
            const selectedFilePath = selectedRadio.value;
            const selectedFile = matchingFiles.find(file => file.path === selectedFilePath);
            if (selectedFile) {
              const chatHistoryFilePath = selectedFile.path;
              const success = await loadChatHistory(chatHistoryFilePath);
              if (success) {
                new Notice(`Switched to '${selectedFile.path}' chat history.`);
                lastLoadedChatHistoryFile = selectedFile;
    
                settings.profiles.lastLoadedChatHistoryPath = selectedFile.path;
    
                // Update the lastLoadedChatHistoryPath for the current profile
                settings.profiles.lastLoadedChatHistory[profileIndex] = settings.profiles.lastLoadedChatHistoryPath;
                await plugin.saveSettings();
              }
              modal.close();
            }
          }
        });
      }
    
      modal.contentEl.appendChild(modalContent);
      modal.open();
    } else if (Object.values(loadAliases).map(v => v.toLowerCase()).includes(inputValue.toLowerCase())) {
      const matchedFile = Object.entries(loadAliases).find(([key, value]) => value.toLowerCase() === inputValue.toLowerCase());
    
      if (matchedFile) {
        const matchingFiles = files.filter(file => file.name.includes(matchedFile[1]));
    
        // matchingFiles.forEach(file => {
        //   console.log(file.path);
        // });
    
        // Create modal content
        const modal = new Modal(plugin.app);
        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');
    
        const heading = document.createElement('h2');
        heading.textContent = 'Load Chat History';
        modalContent.appendChild(heading);
    
        if (matchingFiles.length === 1) {
          // Display confirmation message for a single file
          const message = document.createElement('p');
          message.textContent = `Are you sure you want to override your current chat history with "${matchingFiles[0].name}"?`;
          modalContent.appendChild(message);
      
          const confirmLoadButton = document.createElement('button');
          confirmLoadButton.id = 'confirmLoad';
          confirmLoadButton.textContent = 'Confirm';
          modalContent.appendChild(confirmLoadButton);
    
          confirmLoadButton?.addEventListener('click', async function () {
            const selectedFile = matchingFiles[0];
            const chatHistoryFilePath = selectedFile.path;
            const success = await loadChatHistory(chatHistoryFilePath);
            if (success) {
              new Notice(`Switched to '${selectedFile.path}' chat history.`);
              lastLoadedChatHistoryFile = selectedFile;
  
              settings.profiles.lastLoadedChatHistoryPath = selectedFile.path;
  
              // Update the lastLoadedChatHistoryPath for the current profile
              settings.profiles.lastLoadedChatHistory[profileIndex] = settings.profiles.lastLoadedChatHistoryPath;
              await plugin.saveSettings();
            }
            modal.close();
          });
        } else {
          // Display file options for multiple matching files
          const message = document.createElement('p');
          message.textContent = 'Select a chat history to override:';
          modalContent.appendChild(message);
    
          // Create a container for file options
          const optionsContainer = document.createElement('div');
          optionsContainer.classList.add('file-options');
          optionsContainer.style.marginBottom = '16px';
    
          // Create a radio button and label for each matching file
          matchingFiles.forEach((file, index) => {
            const radioElement = document.createElement('input');
            radioElement.type = 'radio';
            radioElement.name = 'fileOption';
            radioElement.value = file.path;
            radioElement.id = `file-${index}`;
    
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `file-${index}`;
            labelElement.textContent = file.path;
    
            optionsContainer.appendChild(radioElement);
            optionsContainer.appendChild(labelElement);
            optionsContainer.appendChild(document.createElement('br'));
          });
    
          modalContent.appendChild(optionsContainer);
    
          const confirmLoadButton = document.createElement('button');
          confirmLoadButton.id = 'confirmLoad';
          confirmLoadButton.textContent = 'Load';
          modalContent.appendChild(confirmLoadButton);
    
          confirmLoadButton?.addEventListener('click', async function () {
            const selectedRadio = optionsContainer.querySelector('input[type="radio"]:checked') as HTMLInputElement;
            if (selectedRadio) {
              const selectedFilePath = selectedRadio.value;
              const selectedFile = matchingFiles.find(file => file.path === selectedFilePath);
              if (selectedFile) {
                const chatHistoryFilePath = selectedFile.path;
                const success = await loadChatHistory(chatHistoryFilePath);
                if (success) {
                  new Notice(`Switched to '${selectedFile.path}' chat history.`);
                  lastLoadedChatHistoryFile = selectedFile;
      
                  settings.profiles.lastLoadedChatHistoryPath = selectedFile.path;
      
                  // Update the lastLoadedChatHistoryPath for the current profile
                  settings.profiles.lastLoadedChatHistory[profileIndex] = settings.profiles.lastLoadedChatHistoryPath;
                  await plugin.saveSettings();
                }
                modal.close();
              }
            }
          });
        }
    
        modal.contentEl.appendChild(modalContent);
        modal.open();
      }
    } else {
      new Notice('File does not exist.');
    }

  }
}

// `/stop` to stop fetching response
export function commandStop() {
  const controller = getAbortController();
  if (controller) {
      controller.abort();
  }
}

export async function removeMessageThread(plugin: BMOGPT, index: number) {
  const messageContainer = document.querySelector('#messageContainer');

  const divElements = messageContainer?.querySelectorAll('div.botMessage, div.userMessage');

  if (divElements && divElements.length > 0 && index >= 0 && index < divElements.length) {
    for (let i = index; i < divElements.length; i++) {
      messageContainer?.removeChild(divElements[i]);
    }
  }

  messageHistory.splice(index);
  const jsonString = JSON.stringify(messageHistory, null, 4);

  try {
      await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), jsonString);
        // Fetching files from the specified folder (profiles)
        const profileFiles = plugin.app.vault.getFiles().filter((file) => file.path.startsWith(plugin.settings.profiles.profileFolderPath));

        // Sorting the files array alphabetically by file name
        profileFiles.sort((a, b) => a.name.localeCompare(b.name));

        const currentProfile = plugin.settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension

        // Finding the index of the currentProfile in the profileFiles array
        const profileIndex = profileFiles.findIndex((file) => file.basename === currentProfile);
      lastLoadedChatHistoryFile = null;
      plugin.settings.profiles.lastLoadedChatHistoryPath = null;

      // Update the lastLoadedChatHistoryPath for the current profile
      plugin.settings.profiles.lastLoadedChatHistory[profileIndex] = plugin.settings.profiles.lastLoadedChatHistoryPath;

      await plugin.saveSettings();
      new Notice('Chat history cleared.');
  } catch (error) {
      console.error('Error writing messageHistory.json', error);
  }
}
