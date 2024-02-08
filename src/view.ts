import { ItemView, WorkspaceLeaf, Notice, TFile, MarkdownView, Editor, EditorPosition } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { fetchOpenAIAPIDataStream, fetchOpenAIAPIData, fetchOllamaData, fetchOllamaDataStream, fetchAnthropicAPIData, fetchRESTAPIURLData, fetchRESTAPIURLDataStream, fetchMistralData, fetchMistralDataStream, fetchGoogleGeminiData } from "./components/FetchModel";
import { executeCommand } from "./components/chat/Commands";
import { getActiveFileContent } from "./components/editor/ReferenceCurrentNote";
import { addMessage } from "./components/chat/Message";
import { displayUserMessage } from "./components/chat/UserMessage";
import { displayBotMessage } from "./components/chat/BotMessage";
export const VIEW_TYPE_CHATBOT = "chatbot-view";
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';

export const ANTHROPIC_MODELS = ["claude-instant-1.2", "claude-2.0", "claude-2.1"];
export const OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-4", "gpt-4-turbo-preview"];

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
    public settings: BMOSettings;
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
        return "BMO Chatbot";
    }
    
    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        const chatbotContainer = container.createEl("div", {
            attr: {
                class: "chatbotContainer",
            },
        });

        const header = chatbotContainer.createEl("div", {
            attr: {
                id: "header",
            },
        });
        
        const chatbotNameHeading = chatbotContainer.createEl("h1", { 
            text: this.settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName,
            attr: {
                id: "chatbotNameHeading"
            }
        });

        const modelName = chatbotContainer.createEl("p", {
            text: "Model: " + this.settings.general.model || DEFAULT_SETTINGS.general.model,
            attr: {
                id: "modelName"
            }
        });

        const spanElement = chatbotContainer.createEl("span", {
            attr: {
                class: "dotIndicator",
                id: "markDownBoolean"
            }
        });
        
        const referenceCurrentNoteElement = chatbotContainer.createEl("p", {
            text: "Reference Current Note",
            attr: {
                id: "referenceCurrentNote"
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
    
        const messageContainer = chatbotContainer.createEl("div", {
            attr: {
                id: "messageContainer",
            },
        });

        header.appendChild(chatbotNameHeading);
        header.appendChild(modelName);

        if (this.settings.appearance.allowHeader) {
            header.style.display = 'block';
        }
        else {
            header.style.display = 'none';
            messageContainer.style.maxHeight = `calc(100% - 60px)`;
            referenceCurrentNoteElement.style.margin = `0.5rem 0 0.5rem 0`;
        }
        
        await loadData();
        
        messageContainer.id = "messageContainer";
        
        messageHistory.forEach(async (messageData) => {   
            if (messageData.role == "user") {
                const userMessageDiv = displayUserMessage(this.settings, messageData.content);
                messageContainer.appendChild(userMessageDiv);
            }
        
            if (messageData.role == "assistant") {
                const botMessageDiv = displayBotMessage(this.settings, messageHistory, messageData.content);
                messageContainer.appendChild(botMessageDiv);
            
                const botMessages = messageContainer.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];
                lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        const parentElement = document.getElementById("parentElementId");
        parentElement?.appendChild(messageContainer);

        const chatbox = chatbotContainer.createEl("div", {
            attr: {
                class: "chatbox",
            }
        });

        const textarea = document.createElement("textarea");
        textarea.setAttribute("contenteditable", true.toString());
        textarea.setAttribute("placeholder", "Start typing...");
        chatbox.appendChild(textarea);
        
        this.textareaElement = textarea as HTMLTextAreaElement;
        this.addEventListeners();
    }

    addEventListeners() {
        this.textareaElement.addEventListener("keyup", this.handleKeyup.bind(this));
        this.textareaElement.addEventListener("keydown", this.handleKeydown.bind(this));
        this.textareaElement.addEventListener("input", this.handleInput.bind(this));
        this.textareaElement.addEventListener("blur", this.handleBlur.bind(this));
    }
    
    async handleKeyup(event: KeyboardEvent) {
        const input = this.textareaElement.value.trim();
        const index = messageHistory.length - 1;

        // Only allow /stop command to be executed during fetch
        if (this.settings.OllamaConnection.allowOllamaStream || !this.settings.OllamaConnection.ollamaModels.includes(this.settings.general.model)) {
            if ((input === "/s" || input === "/stop") && event.key === "Enter") {
                this.preventEnter = false;
                executeCommand(input, this.settings, this.plugin);
            }
        }

        if (this.preventEnter === false && !event.shiftKey && event.key === "Enter") {
            loadData();
            event.preventDefault();
            if (input.length === 0) {
                return;
            }

            if (ANTHROPIC_MODELS.includes(this.settings.general.model)) {
                addMessage('\n\nHuman: ' + input, 'userMessage', this.settings, index);
            } else {
                if (!(input === "/s" || input === "/stop")) {
                    addMessage(input, 'userMessage', this.settings, index);
                }
            }
            
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                const userMessageDiv = displayUserMessage(this.settings, input);
                messageContainer.appendChild(userMessageDiv);

                if (input.startsWith("/")) {
                    executeCommand(input, this.settings, this.plugin);
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
                            const botParagraph = document.createElement("p");
                            botParagraph.textContent = "Oops, something went wrong. Please try again.";
                        });
                }
            }

            this.textareaElement.value = "";
            this.textareaElement.style.height = "29px";
            this.textareaElement.value = this.textareaElement.value.replace(/^[\r\n]+|[\r\n]+$/gm,""); // remove newlines only at beginning or end of input
            this.textareaElement.setSelectionRange(0, 0);
            }
    }

    handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
        }
    }

    handleInput(event: Event) {
        this.textareaElement.style.height = "29px";
        this.textareaElement.style.height = this.textareaElement.scrollHeight + "px";
    }

    handleBlur(event: Event) {
        if (!this.textareaElement.value) {
            this.textareaElement.style.height = "29px";
        }
    }

    exportSettings() {
        return this.settings;
    }

    addCursorLogging() {
        const updateCursorPosition = async () => {
            await getActiveFileContent(this.settings); 
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const cursor = view.editor.getCursor();
                lastCursorPositionFile = this.app.workspace.getActiveFile();
                if (cursor != null && this.app.workspace.activeEditor != null) {
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
        this.textareaElement.removeEventListener("keyup", this.handleKeyup.bind(this));
        this.textareaElement.addEventListener("keydown", this.handleKeydown.bind(this));
        this.textareaElement.removeEventListener("input", this.handleInput.bind(this));
        this.textareaElement.removeEventListener("blur", this.handleBlur.bind(this));
    }

    async BMOchatbot() {        
        await getActiveFileContent(this.settings);
        const messageContainerEl = document.querySelector('#messageContainer');
        const chatbotNameHeading = document.querySelector('#chatbotNameHeading');

        const chatbox = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;

        // If apiKey does not exist.
        if (!this.settings.APIConnections.openAI.APIKey && OPENAI_MODELS.includes(this.settings.general.model)) {
            new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
            if (chatbotNameHeading){
                chatbotNameHeading.textContent = "ERROR";
            }

            const lastDiv = messageContainerEl?.lastElementChild as HTMLDivElement;
            const errorMessage = document.createElement('p');
            errorMessage.textContent = "API key not found. Please add your OpenAI API key in the plugin settings.";
            errorMessage.classList.add('errorMessage');
            const chatbotNameError = lastDiv.querySelector('.chatbotName') as HTMLDivElement;
            chatbotNameError.textContent = "ERROR";
            lastDiv.appendChild(errorMessage);
            chatbox.disabled = true;
        } 
        else {
            const index = messageHistory.length - 1;
            // Fetch OpenAI API
            if (OPENAI_MODELS.includes(this.settings.general.model) || (this.settings.APIConnections.openAI.openAIBaseModels.includes(this.settings.general.model) && this.settings.APIConnections.openAI.openAIBaseUrl !== DEFAULT_SETTINGS.APIConnections.openAI.openAIBaseUrl)) {
                try {
                    if (this.settings.APIConnections.openAI.allowOpenAIBaseUrlDataStream) {
                        await fetchOpenAIAPIDataStream(this.settings, index); 
                    }
                    else {
                        await fetchOpenAIAPIData(this.settings, index); 
                    }
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (this.settings.OllamaConnection.RESTAPIURL && this.settings.OllamaConnection.ollamaModels.includes(this.settings.general.model)) {
                if (this.settings.OllamaConnection.allowOllamaStream) {
                    await fetchOllamaDataStream(this.settings, index);
                }
                else {
                    await fetchOllamaData(this.settings, index);
                }
            }
            else if (this.settings.RESTAPIURLConnection.RESTAPIURL && this.settings.RESTAPIURLConnection.RESTAPIURLModels.includes(this.settings.general.model)){
                try {
                    if (this.settings.RESTAPIURLConnection.allowRESTAPIURLDataStream) {
                        await fetchRESTAPIURLDataStream(this.settings, index);
                    }
                    else {
                        await fetchRESTAPIURLData(this.settings, index);
                    }
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (this.settings.APIConnections.mistral.mistralModels.includes(this.settings.general.model)) {
                try {
                    if (this.settings.APIConnections.mistral.allowStream) {
                        await fetchMistralDataStream(this.settings, index);
                    }
                    else {
                        await fetchMistralData(this.settings, index);
                    }
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
            else if (this.settings.APIConnections.googleGemini.geminiModels.includes(this.settings.general.model)) {
                try {
                    await fetchGoogleGeminiData(this.settings, index);
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
            else if (ANTHROPIC_MODELS.includes(this.settings.general.model)) {
                try {
                    await fetchAnthropicAPIData(this.settings, index);
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }

        }
        // console.log("BMO settings:", this.settings);
    }

    async onClose() {
        // Nothing to clean up.
    }

}

// Create data folder and load JSON file
async function loadData() {
    if (!await this.app.vault.adapter.exists('./.obsidian/plugins/bmo-chatbot/data/')) {
        this.app.vault.adapter.mkdir('./.obsidian/plugins/bmo-chatbot/data/');
    }

    if (await this.app.vault.adapter.exists(filenameMessageHistoryJSON)) {
        try {
            const fileContent = await this.app.vault.adapter.read(filenameMessageHistoryJSON);

            if (fileContent.trim() === "") {
                messageHistory = [];
            } else {
                messageHistory = JSON.parse(fileContent);
            }
        } catch (error) {
            console.error("Error processing message history:", error);
        }
    } else {
        messageHistory = [];
    }
}