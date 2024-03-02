import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Editor, EditorPosition } from 'obsidian';
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { fetchOpenAIAPIResponseStream, fetchOpenAIAPIResponse, fetchOllamaResponse, fetchOllamaResponseStream, fetchRESTAPIURLResponse, fetchRESTAPIURLResponseStream, fetchMistralResponse, fetchMistralResponseStream, fetchGoogleGeminiResponse, fetchAnthropicResponse } from './components/FetchModelResponse';
import { executeCommand } from './components/chat/Commands';
import { getActiveFileContent } from './components/editor/ReferenceCurrentNote';
import { addMessage } from './components/chat/Message';
import { displayUserMessage } from './components/chat/UserMessage';
import { displayBotMessage, displayErrorBotMessage } from './components/chat/BotMessage';
export const VIEW_TYPE_CHATBOT = 'chatbot-view';
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';

export const ANTHROPIC_MODELS = ['claude-instant-1.2', 'claude-2.0', 'claude-2.1'];
export const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-1106', 'gpt-4', 'gpt-4-turbo-preview'];

export let messageHistory: { role: string; content: string }[] = [];

export function clearMessageHistory() {
    messageHistory = [];
}

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

        const spanElement = chatbotContainer.createEl('span', {
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

        referenceCurrentNoteElement.appendChild(spanElement);

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

        header.appendChild(chatbotNameHeading);
        header.appendChild(modelName);

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
            
                const botMessages = messageContainer.querySelectorAll('.botMessage');
                const lastBotMessage = botMessages[botMessages.length - 1];
                lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

        textarea.style.backgroundColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        textarea.style.borderColor = this.settings.appearance.chatBoxBackgroundColor || DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor;
        chatbox.style.backgroundColor = this.settings.appearance.chatBoxBorderColor || DEFAULT_SETTINGS.appearance.chatBoxBorderColor;

        chatbox.appendChild(textarea);
        
        this.textareaElement = textarea as HTMLTextAreaElement;
        this.addEventListeners();
    }

    addEventListeners() {
        this.textareaElement.addEventListener('keyup', this.handleKeyup.bind(this));
        this.textareaElement.addEventListener('keydown', this.handleKeydown.bind(this));
        this.textareaElement.addEventListener('input', this.handleInput.bind(this));
        this.textareaElement.addEventListener('blur', this.handleBlur.bind(this));
    }
    
    async handleKeyup(event: KeyboardEvent) {
        const input = this.textareaElement.value;
        const index = messageHistory.length - 1;

        // Only allow /stop command to be executed during fetch
        if (this.settings.OllamaConnection.allowOllamaStream || !this.settings.OllamaConnection.ollamaModels.includes(this.settings.general.model)) {
            if ((input === '/s' || input === '/stop') && event.key === 'Enter') {
                this.preventEnter = false;
                executeCommand(input, this.settings, this.plugin);
            }
        }

        if (this.preventEnter === false && !event.shiftKey && event.key === 'Enter') {
            loadData(this.plugin);
            event.preventDefault();
            if (input.length === 0) {
                return;
            }

            if (!(input === '/s' || input === '/stop')) {
                addMessage(this.plugin, input, 'userMessage', this.settings, index);
            }
            
            const messageContainer = document.querySelector('#messageContainer');
            if (messageContainer) {
                const userMessageDiv = displayUserMessage(this.plugin, this.settings, input);
                messageContainer.appendChild(userMessageDiv);

                if (input.startsWith('/')) {
                    executeCommand(input, this.settings, this.plugin);

                    if (input !== '/c' && input !== '/clear') {
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
            this.textareaElement.value = this.textareaElement.value.replace(/^[\r\n]+|[\r\n]+$/gm,''); // remove newlines only at beginning or end of input
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
                if (this.settings.OllamaConnection.allowOllamaStream) {
                    await fetchOllamaResponseStream(this.plugin, this.settings, index);
                }
                else {
                    await fetchOllamaResponse(this.plugin, this.settings, index);
                }
            }
            else if (this.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(this.settings.general.model)){
                if (this.settings.RESTAPIURLConnection.allowRESTAPIURLDataStream) {
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
                if (this.settings.APIConnections.openAI.allowOpenAIBaseUrlDataStream) {
                    await fetchOpenAIAPIResponseStream(this.plugin, this.settings, index); 
                }
                else {
                    await fetchOpenAIAPIResponse(this.plugin, this.settings, index); 
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

    if (await plugin.app.vault.adapter.exists(filenameMessageHistoryJSON)) {
        try {
            const fileContent = await plugin.app.vault.adapter.read(filenameMessageHistoryJSON);

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