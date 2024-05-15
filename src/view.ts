import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Editor, EditorPosition, setIcon } from 'obsidian';
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { executeCommand } from './components/chat/Commands';
import { getActiveFileContent } from './components/editor/ReferenceCurrentNote';
import { addMessage } from './components/chat/Message';
import { displayUserMessage } from './components/chat/UserMessage';
import { displayBotMessage, displayErrorBotMessage } from './components/chat/BotMessage';
import { fetchOpenAIAPIResponseStream, 
        fetchOpenAIAPIResponse, 
        fetchOllamaResponse, 
        fetchOllamaResponseStream, 
        fetchRESTAPIURLResponse, 
        fetchRESTAPIURLResponseStream, 
        fetchMistralResponse, 
        fetchMistralResponseStream, 
        fetchGoogleGeminiResponse, 
        fetchAnthropicResponse, 
        fetchOpenRouterResponseStream,
        fetchOpenRouterResponse} from './components/FetchModelResponse';

export const VIEW_TYPE_CHATBOT = 'chatbot-view';
export const ANTHROPIC_MODELS = ['claude-instant-1.2', 'claude-2.0', 'claude-2.1', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
export const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];

export function filenameMessageHistoryJSON(plugin: BMOGPT) {
    const filenameMessageHistoryPath = './.obsidian/plugins/bmo-chatbot/data/';
    const currentProfileMessageHistory = 'messageHistory_' + plugin.settings.profiles.profile.replace('.md', '.json');

    return filenameMessageHistoryPath + currentProfileMessageHistory;
}

export let messageHistory: { role: string; content: string }[] = [];

export let lastCursorPosition: EditorPosition = {
    line: 0,
    ch: 0,
}

export let lastCursorPositionFile: TFile | null = null;
export let activeEditor: Editor | null | undefined = null;

export class BMOView extends ItemView {
    private settings: BMOSettings;
    private textareaElement: HTMLTextAreaElement;
    private preventEnter = false;
    private plugin: BMOGPT;

    constructor(leaf: WorkspaceLeaf, settings: BMOSettings, plugin: BMOGPT) {
        super(leaf);
        this.settings = settings;
        this.plugin = plugin;
        this.icon = 'bot';
        this.addCursorLogging();
    }

    getViewType() {
        return VIEW_TYPE_CHATBOT;
    }

    getDisplayText() {
        return 'BMO Chatbot';
    }
    
    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        const chatbotContainer = container.createEl('div', {
            attr: {
                class: 'chatbotContainer',
            },
        });

        const header = chatbotContainer.createEl('div', {
            attr: {
                id: 'header',
            },
        });
        
        const chatbotNameHeading = chatbotContainer.createEl('h1', { 
            text: this.settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName,
            attr: {
                id: 'chatbotNameHeading'
            }
        });

        const modelName = chatbotContainer.createEl('p', {
            text: 'Model: ' + this.settings.general.model || DEFAULT_SETTINGS.general.model,
            attr: {
                id: 'modelName'
            }
        });

        const dotIndicator = chatbotContainer.createEl('span', {
            attr: {
                class: 'dotIndicator',
                id: 'markDownBoolean'
            }
        });
        
        const referenceCurrentNoteElement = chatbotContainer.createEl('p', {
            text: 'Reference Current Note',
            attr: {
                id: 'referenceCurrentNote'
            }
        });

        header.appendChild(chatbotNameHeading);
        header.appendChild(modelName);

        referenceCurrentNoteElement.appendChild(dotIndicator);

        referenceCurrentNoteElement.style.display = 'none';
        
        if (referenceCurrentNoteElement) {
            if (this.settings.general.allowReferenceCurrentNote) {
                referenceCurrentNoteElement.style.display = 'block';
            } else {
                referenceCurrentNoteElement.style.display = 'none';
            }
        }
    
        const messageContainer = chatbotContainer.createEl('div', {
            attr: {
                id: 'messageContainer',
            },
        });

        if (this.settings.appearance.allowHeader) {
            header.style.display = 'block';
        }
        else {
            header.style.display = 'none';
            messageContainer.style.maxHeight = 'calc(100% - 60px)';
            referenceCurrentNoteElement.style.margin = '0.5rem 0 0.5rem 0';
        }
        
        await loadData(this.plugin);
        
        messageContainer.id = 'messageContainer';
        
        messageHistory.forEach(async (messageData) => {   
            if (messageData.role == 'user') {
                const userMessageDiv = displayUserMessage(this.plugin, this.settings, messageData.content);
                messageContainer.appendChild(userMessageDiv);
            }
        
            if (messageData.role == 'assistant') {
                const botMessageDiv = displayBotMessage(this.plugin, this.settings, messageHistory, messageData.content);
                messageContainer.appendChild(botMessageDiv);
            }
        });

        // Open notes/links from chatbot
        messageContainer.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'A' && target.classList.contains('internal-link')) {
                const link = target as HTMLAnchorElement;
                const linkName = link.getAttribute('data-href') || '';
                this.plugin.app.workspace.openLinkText(linkName, '', false);
            }
        });
        
        const parentElement = document.getElementById('parentElementId');
        parentElement?.appendChild(messageContainer);

        const chatbox = chatbotContainer.createEl('div', {
            attr: {
                class: 'chatbox',
            }
        });

        const textarea = document.createElement('textarea');
        textarea.setAttribute('contenteditable', true.toString());
        textarea.setAttribute('placeholder', 'Start typing...');


        if (textarea) {
            textarea.style.color = this.settings.appearance.chatBoxFontColor;
            
            // Set the placeholder color to the default value
            const style = document.createElement('style');
            style.textContent = `
                .chatbox textarea::placeholder {
                    color: ${this.settings.appearance.chatBoxFontColor} !important;
                }
            `;
            textarea.appendChild(style);
        }

        // Submit button
        const submitButton = document.createElement('button');
        submitButton.textContent = 'send';
        setIcon(submitButton, 'arrow-up');
        submitButton.classList.add('submit-button');
        submitButton.title = 'send';

        submitButton.addEventListener('click', () => {
            this.handleKeyup(new KeyboardEvent('keyup', { key: 'Enter' }), true);
        });


        chatbotContainer.style.backgroundColor = this.settings.appearance.chatbotContainerBackgroundColor || DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor;
        messageContainer.style.backgroundColor = this.settings.appearance.messageContainerBackgroundColor || DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor;
        textarea.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        textarea.style.borderColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        textarea.style.color = this.settings.appearance.chatBoxFontColor || DEFAULT_SETTINGS.appearance.chatBoxFontColor;
        chatbox.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        submitButton.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;


        const userMessages = messageContainer.querySelectorAll('.userMessage');
        userMessages.forEach((userMessage: HTMLElement) => {
            userMessage.style.color = this.settings.appearance.userMessageFontColor || DEFAULT_SETTINGS.appearance.userMessageFontColor;
        });

        const botMessages = messageContainer.querySelectorAll('.botMessage');
        botMessages.forEach((botMessage: HTMLElement) => {
            botMessage.style.color = this.settings.appearance.botMessageFontColor || DEFAULT_SETTINGS.appearance.botMessageFontColor;
        });

        chatbox.appendChild(textarea);
        chatbox.appendChild(submitButton);
        
        this.textareaElement = textarea as HTMLTextAreaElement;
        this.addEventListeners();

        // Scroll to bottom of messageContainer
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    addEventListeners() {
        this.textareaElement.addEventListener('keyup', this.handleKeyup.bind(this));
        this.textareaElement.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textareaElement.addEventListener('input', this.handleInput.bind(this));
        this.textareaElement.addEventListener('blur', this.handleBlur.bind(this));
    }
    
    async handleKeyup(event: KeyboardEvent, fromSubmitButton = false) {
        // Check if it's mobile and return if true
        if ((document.body.classList.contains('is-mobile') || document.body.classList.contains('is-tablet')) && event.key === 'Enter' && !fromSubmitButton) {
            event.preventDefault();  // Prevent default to avoid any other actions like submit
            this.textareaElement.value += '\n';
            this.handleInput(event);  // Trigger the input event manually
            return;  // Exit the function early
        }
        
        const input = this.textareaElement.value;
        const index = messageHistory.length - 1;

        // Only allow /stop command to be executed during fetch
        if (this.settings.OllamaConnection.allowStream || 
            this.settings.RESTAPIURLConnection.allowStream || 
            this.settings.APIConnections.mistral.allowStream || 
            this.settings.APIConnections.openAI.allowStream) {
            if ((input === '/s' || input === '/stop') && event.key === 'Enter') {
                this.preventEnter = false;
                await executeCommand(input, this.settings, this.plugin);
            }
        }

        if (this.preventEnter === false && !event.shiftKey && event.key === 'Enter') {
            loadData(this.plugin);
            event.preventDefault();
            if (input.length === 0) {
                return;
            }

            // Add all user messages besides certain commands
            if (!input.includes('/c') && 
                !input.includes('/clear') && 
                !input.startsWith('/p ') &&
                !input.startsWith('/prof ') &&
                !input.startsWith('/profile ') &&
                !input.startsWith('/profiles ') &&
                !input.includes('/s') &&
                !input.includes('/stop')) {
                    addMessage(this.plugin, input, 'userMessage', this.settings, index);
            }
            
            const messageContainer = document.querySelector('#messageContainer');
            if (messageContainer) {
                const userMessageDiv = displayUserMessage(this.plugin, this.settings, input);
                messageContainer.appendChild(userMessageDiv);

                if (input.startsWith('/')) {
                    executeCommand(input, this.settings, this.plugin);


                    if (!input.includes('/c') && 
                        !input.includes('/clear') && 
                        (input === '/prof' ||
                        input === '/p' ||
                        input === '/profile' ||
                        input === '/profiles' ||
                        input === '/prompt' ||
                        input === '/prompts' ||
                        input.startsWith('/prompt ') || 
                        input.startsWith('/prompts ')) &&
                        !input.includes('/s') &&
                        !input.includes('/stop')) {
                        const botMessages = messageContainer.querySelectorAll('.botMessage');
                        const lastBotMessage = botMessages[botMessages.length - 1];
                        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    
                    const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                    if (modelName) {
                        modelName.textContent = 'Model: ' + this.settings.general.model.toLowerCase();
                    }
                }   
                else {
                    this.preventEnter = true;

                    // Call the chatbot function with the user's input
                    this.BMOchatbot()
                        .then(() => {
                            this.preventEnter = false;
                        })
                        .catch(() => {
                            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
                            const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, 'Oops, something went wrong. Please try again.');
                            messageContainer.appendChild(botMessageDiv);
                        });
                }
            }

            this.textareaElement.value = '';
            this.textareaElement.style.height = '29px';
            this.textareaElement.value = this.textareaElement.value.trim();
            this.textareaElement.setSelectionRange(0, 0);
        }
    }

    handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
        }
    }

    handleInput(event: Event) {
        this.textareaElement.style.height = '29px';
        this.textareaElement.style.height = this.textareaElement.scrollHeight + 'px';
    }

    handleBlur(event: Event) {
        if (!this.textareaElement.value) {
            this.textareaElement.style.height = '29px';
        }
    }

    exportSettings() {
        return this.settings;
    }

    addCursorLogging() {
        const updateCursorPosition = async () => {
            await getActiveFileContent(this.plugin, this.settings); 
            const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const cursor = view.editor.getCursor();
                lastCursorPositionFile = this.plugin.app.workspace.getActiveFile();
                if (cursor != null && this.plugin.app.workspace.activeEditor != null) {
                    lastCursorPosition = cursor;
                    activeEditor = view.editor;
                }

                const modelName = document.querySelector('#modelName');
                if (modelName) {
                    modelName.textContent = 'Model: ' + this.plugin.settings.general.model;
                }
            }
        };

        activeWindow.addEventListener('click', updateCursorPosition);
        activeWindow.addEventListener('keyup', updateCursorPosition);
        activeWindow.addEventListener('keydown', updateCursorPosition);
        activeWindow.addEventListener('input', updateCursorPosition);
    }

    
    cleanup() {
        this.textareaElement.removeEventListener('keyup', this.handleKeyup.bind(this));
        this.textareaElement.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textareaElement.removeEventListener('input', this.handleInput.bind(this));
        this.textareaElement.removeEventListener('blur', this.handleBlur.bind(this));
    }

    async BMOchatbot() {      
        await getActiveFileContent(this.plugin, this.settings);
        const index = messageHistory.length - 1;

        // If model does not exist.
        if (this.settings.general.model === '') {
            const errorMessage = 'Model not found.';

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, errorMessage);
            messageContainer.appendChild(botMessageDiv);

            const botMessages = messageContainer.querySelectorAll('.botMessage');
            const lastBotMessage = botMessages[botMessages.length - 1];
            lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } 
        else {
            // Fetch OpenAI API
            if (this.settings.OllamaConnection.ollamaModels.includes(this.settings.general.model)) {
                if (this.settings.OllamaConnection.allowStream) {
                    await fetchOllamaResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchOllamaResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(this.settings.general.model)){
                if (this.settings.RESTAPIURLConnection.allowStream) {
                    await fetchRESTAPIURLResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchRESTAPIURLResponse(this.plugin, this.settings, index);
                }
            }
            else if (ANTHROPIC_MODELS.includes(this.settings.general.model)) {
                await fetchAnthropicResponse(this.plugin, this.settings, index);
            }
            else if (this.settings.APIConnections.mistral.mistralModels.includes(this.settings.general.model)) {
                if (this.settings.APIConnections.mistral.allowStream) {
                    await fetchMistralResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchMistralResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.APIConnections.googleGemini.geminiModels.includes(this.settings.general.model)) {
                await fetchGoogleGeminiResponse(this.plugin, this.settings, index);
            }
            else if (this.settings.APIConnections.openAI.openAIBaseModels.includes(this.settings.general.model)) {
                if (this.settings.APIConnections.openAI.allowStream) {
                    await fetchOpenAIAPIResponseStream(this.plugin, this.settings, index); 
                }
                else {
                    await fetchOpenAIAPIResponse(this.plugin, this.settings, index); 
                }
            }
            else if (this.settings.APIConnections.openRouter.openRouterModels.includes(this.settings.general.model)){
                if (this.settings.APIConnections.openRouter.allowStream) {
                    await fetchOpenRouterResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchOpenRouterResponse(this.plugin, this.settings, index);
                }
            }
            else {
                const errorMessage = 'Connection not found.';

                const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
                const botMessageDiv = displayErrorBotMessage(this.plugin, this.settings, messageHistory, errorMessage);
                messageContainer.appendChild(botMessageDiv);

                const botMessages = messageContainer.querySelectorAll('.botMessage');
                const lastBotMessage = botMessages[botMessages.length - 1];
                lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        }
        // console.log('BMO settings:', this.settings);
    }

    async onClose() {
        // Nothing to clean up.
    }

}

// Create data folder and load JSON file
async function loadData(plugin: BMOGPT) {
    if (!await plugin.app.vault.adapter.exists('./.obsidian/plugins/bmo-chatbot/data/')) {
        plugin.app.vault.adapter.mkdir('./.obsidian/plugins/bmo-chatbot/data/');
    }

    if (await plugin.app.vault.adapter.exists(filenameMessageHistoryJSON(plugin))) {
        try {
            const fileContent = await plugin.app.vault.adapter.read(filenameMessageHistoryJSON(plugin));

            if (fileContent.trim() === '') {
                messageHistory = [];
            } else {
                messageHistory = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Error processing message history:', error);
        }
    } else {
        messageHistory = [];
    }
}

// Delete all messages from the messageContainer and the messageHistory array
export async function deleteAllMessages(plugin: BMOGPT) {
    const messageContainer = document.querySelector('#messageContainer');

    // Remove all child nodes from the messageContainer
    if (messageContainer) {
        while (messageContainer.firstChild) {
            messageContainer.removeChild(messageContainer.firstChild);
        }
    }

    // Clear the messageHistory array
    messageHistory = [];

    // Write an empty array to the messageHistory.json file
    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await plugin.app.vault.adapter.write(filenameMessageHistoryJSON(plugin), jsonString);
    } catch (error) {
        console.error('Error writing messageHistory.json', error);
    }
}