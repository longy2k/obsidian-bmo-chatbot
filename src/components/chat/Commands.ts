import { Notice, TFile } from 'obsidian';
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
  generalCommandHeader.style.textAlign = 'center';
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
  profileCommandHeader.style.textAlign = 'center';
  displayCommandBotMessageDiv.appendChild(profileCommandHeader);

  const commandProfileListP = document.createElement('p');
  commandProfileListP.innerHTML = '<code>/profile</code> - List profile.';
  displayCommandBotMessageDiv.appendChild(commandProfileListP);

  const commandProfileChangeP = document.createElement('p');
  commandProfileChangeP.innerHTML = '<code>/profile [PROFILE-NAME] or [VALUE]</code> - Change profile.';
  displayCommandBotMessageDiv.appendChild(commandProfileChangeP);

  const modelCommandHeader = document.createElement('h4');
  modelCommandHeader.textContent = 'Model Commands';
  modelCommandHeader.style.textAlign = 'center';
  displayCommandBotMessageDiv.appendChild(modelCommandHeader);

  const commandModelListP = document.createElement('p');
  commandModelListP.innerHTML = '<code>/model</code> - List model.';
  displayCommandBotMessageDiv.appendChild(commandModelListP);

  const commandModelChangeP = document.createElement('p');
  commandModelChangeP.innerHTML = '<code>/model [MODEL-NAME] or [VALUE]</code> - Change model.';
  displayCommandBotMessageDiv.appendChild(commandModelChangeP);

  const promptCommandHeader = document.createElement('h4');
  promptCommandHeader.textContent = 'Prompt Commands';
  promptCommandHeader.style.textAlign = 'center';
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
  editorCommandHeader.style.textAlign = 'center';
  displayCommandBotMessageDiv.appendChild(editorCommandHeader);

  const commandAppendP = document.createElement('p');
  commandAppendP.innerHTML = '<code>/append</code> - Append current chat history to current active note.';
  displayCommandBotMessageDiv.appendChild(commandAppendP);

  const commandSaveP = document.createElement('p');
  commandSaveP.innerHTML = '<code>/save</code> - Save current chat history to a note.';
  displayCommandBotMessageDiv.appendChild(commandSaveP);

  const streamCommandHeader = document.createElement('h4');
  streamCommandHeader.textContent = 'Stream Commands';
  streamCommandHeader.style.textAlign = 'center';
  displayCommandBotMessageDiv.appendChild(streamCommandHeader);

  const commandStopP = document.createElement('p');
  commandStopP.innerHTML = '<code>/stop</code> or <code>/s</code> - Stop fetching response for streaming models only.';
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
    const openRouterModels = settings.APIConnections.openRouter.openRouterModels.map(model => model);

    // Combine all models
    const allModels = [
      ...settings.OllamaConnection.ollamaModels,
      ...settings.RESTAPIURLConnection.RESTAPIURLModels,
      ...settings.APIConnections.anthropic.anthropicModels,
      ...settings.APIConnections.googleGemini.geminiModels,
      ...settings.APIConnections.mistral.mistralModels,
      ...settings.APIConnections.openAI.openAIBaseModels,
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
      { header: 'Ollama', items: ollamaModels },
      { header: 'REST API', items: RESTAPIModels },
      { header: 'Anthropic', items: anthropicModels},
      { header: 'Google Gemini', items: googleGeminiModels },
      { header: 'Mistral', items: mistralModels },
      { header: 'OpenAI', items: openAIBaseModels },
      { header: 'OpenRouter', items: openRouterModels }
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
      new Notice('Updated model to {settings.general.model}');
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

  // Check if the user has not specified a profile
  if (!input.split(' ')[1]) {

    // Loop through files and create list items, removing the file extension
    const fileListItems = files.map(file => {
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, ''); // Removing the last dot and what follows
      return `<li>${fileNameWithoutExtension}</li>`;
    }).join('');

    let currentProfile = settings.profiles.profile.replace(/\.[^/.]+$/, ''); // Removing the file extension

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

// `/system "[VALUE]"` to change system prompt
// export async function commandSystem(input: string, settings: BMOSettings, plugin: BMOGPT) {
//   let commandBotMessage = '';
//   const commandParts = input.split(' ');
//   const commandAction = commandParts[1] ? commandParts[1].toLowerCase() : '';
//   let systemSettingMessage: string;

//   // Check for clear command first
//   if (commandAction === 'c' || commandAction === 'clear') {
//     settings.general.system_role = '';
//     systemSettingMessage = 'System cleared.';
//   } else if (commandAction !== '') {
//     const systemPromptValue = input.match(/['"]([^'"]+)['"]/) || [null, commandAction];

//     if (systemPromptValue[1] !== null) {
//       // Update system_role with the provided value
//       settings.general.system_role = systemPromptValue[1];
//       systemSettingMessage = `System updated: "${systemPromptValue[1]}"`;
//     } else {
//       // Handle case where no valid system value is provided
//       systemSettingMessage = `Current system: "${settings.general.system_role}"`;
//     }
//   } else {
//     // No action specified
//     systemSettingMessage = `Current system: "${settings.general.system_role}"`;
//   }
  
//   commandBotMessage += `<p><strong>${systemSettingMessage}</strong></p>`;
//   const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
//   const botMessageDiv = displayCommandBotMessage(plugin, settings, messageHistory, commandBotMessage);
//   messageContainer.appendChild(botMessageDiv);

//   await plugin.saveSettings();
// }

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

    // Retrieve model name
    const modelNameElement = document.querySelector('#modelName') as HTMLHeadingElement;
    let modelName = 'Unknown'; // Default model name
    if (modelNameElement && modelNameElement.textContent) {
        modelName = modelNameElement.textContent.replace('Model: ', '').toLowerCase();
    }

    const templateFile = allFiles.find(file => file.path.toLowerCase() === settings.chatHistory.templateFilePath.toLowerCase());

    if (templateFile) {
      let fileContent = await plugin.app.vault.read(templateFile);
  
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

          // Remove the rendered note link from the message content
          const regexRenderedLink = /<link-rendered>[\s\S]*?<\/link-rendered>/g;
          message.content = message.content.replace(regexRenderedLink, '').trim();

          // Remove rendered note
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

    // Create the new note with formatted Markdown content
    const file = await plugin.app.vault.create(fileName, markdownContent);
    if (file) {
      new Notice('Saved conversation.');

      // Open the newly created note in a new pane
      plugin.app.workspace.openLinkText(fileName, '', true, { active: true });
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
      new Notice('Chat history cleared.');
  } catch (error) {
      console.error('Error writing messageHistory.json', error);
  }
}