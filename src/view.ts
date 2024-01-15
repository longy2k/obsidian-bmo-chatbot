import { ItemView, WorkspaceLeaf, Notice, TFile, MarkdownView, Editor, EditorPosition } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { colorToHex } from "./utils/ColorConverter";
import { fetchOpenAIAPI, fetchOpenAIBaseAPI, ollamaFetchData, ollamaFetchDataStream, requestUrlAnthropicAPI, openAIRestAPIFetchData, openAIRestAPIFetchDataStream } from "./components/FetchModel";
import { executeCommand } from "./components/chat/Commands";
import { marked } from "marked";
import { prismHighlighting } from "./components/PrismaHighlighting";
import { codeBlockCopyButton, displayAppendButton, displayBotCopyButton, displayTrashButton, displayUserCopyButton, regenerateUserButton } from "./components/chat/Buttons";
import { getActiveFileContent } from "./components/ReferenceCurrentNoteIndicator";
import { addMessage, addParagraphBreaks } from "./components/chat/Message";
export const VIEW_TYPE_CHATBOT = "chatbot-view";
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';

export const ANTHROPIC_MODELS = ["claude-instant-1.2", "claude-2.0", "claude-2.1"];
export const OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-4", "gpt-4-1106-preview"];

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

let referenceCurrentNoteContent = '';


export class BMOView extends ItemView {
    public settings: BMOSettings;
    private textareaElement: HTMLTextAreaElement;
    private loadingAnimationIntervalId: number;
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
        this.registerEvent(this.app.workspace.on("file-open", this.handleFileOpenEvent.bind(this)));

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
            text: this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName,
            attr: {
                id: "chatbotNameHeading"
            }
        });

        const modelName = chatbotContainer.createEl("p", {
            text: "Model: " + this.settings.model || DEFAULT_SETTINGS.model,
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
            if (this.settings.allowReferenceCurrentNote) {
                referenceCurrentNoteElement.style.display = 'block';
            } else {
                referenceCurrentNoteElement.style.display = 'none';
            }
        }
    
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await getActiveFileContent(activeFile);
        }

        const messageContainer = chatbotContainer.createEl("div", {
            attr: {
                id: "messageContainer",
            },
        });

        header.appendChild(chatbotNameHeading);
        header.appendChild(modelName);

        if (this.settings.allowHeader) {
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
            const buttonContainerDiv = document.createElement("div");
            buttonContainerDiv.className = "button-container";

            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                if (this.settings.allowReferenceCurrentNote) {
                    referenceCurrentNoteContent = await getActiveFileContent(activeFile);
                }
            }

            if (messageData.role == "user") {
                
                const userMessageDiv = document.createElement("div");
                userMessageDiv.className = "userMessage";
                userMessageDiv.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || 
                    getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
                
                const userMessageToolBarDiv = document.createElement("div");
                userMessageToolBarDiv.className = "userMessageToolBar";
                
                const userNameSpan = document.createElement("span");
                userNameSpan.className = "userName";
                userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
                const userP = document.createElement("p");

                const copyUserButton = displayUserCopyButton(userP);
                const trashButton = displayTrashButton();
                
                userMessageToolBarDiv.appendChild(userNameSpan);
                userMessageToolBarDiv.appendChild(buttonContainerDiv);
                buttonContainerDiv.appendChild(copyUserButton);
                buttonContainerDiv.appendChild(trashButton);
                userMessageDiv.appendChild(userMessageToolBarDiv);
                userMessageDiv.appendChild(userP);
                messageContainer.appendChild(userMessageDiv);

                if (ANTHROPIC_MODELS.includes(this.settings.model)) {
                    const fullString = messageData.content;
                    const cleanString = fullString.split(' ').slice(1).join(' ').trim();
                    userP.innerHTML = marked(cleanString);
                } else {
                    userP.innerHTML = marked(messageData.content);
                }

                const messageText = messageData.content;
                const userMessages = messageContainer.querySelectorAll(".userMessage");

                // Clear any existing regenerate buttons
                userMessages.forEach(message => {
                    const existingRegenerateButton = message.querySelector(".regenerate-button");
                    if (existingRegenerateButton) {
                        existingRegenerateButton.remove();
                    }
                });
                if (!messageText.startsWith("/")) {
                    const lastUserMessage = userMessages[userMessages.length - 1];
                    const lastUserMessageToolBarDiv = lastUserMessage.querySelector(".userMessageToolBar");
                    const lastButtonContainerDiv = lastUserMessageToolBarDiv?.querySelector(".button-container");
                    const regenerateButton = regenerateUserButton(this.settings, referenceCurrentNoteContent);
                    lastButtonContainerDiv?.insertBefore(regenerateButton, lastButtonContainerDiv.firstChild);
                }
                
            }
        
            if (messageData.role == "assistant") {
                const botMessageDiv = document.createElement("div");
                botMessageDiv.className = "botMessage";
                botMessageDiv.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor ||
                    getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());

                const botMessageToolBarDiv = document.createElement("div");
                botMessageToolBarDiv.className = "botMessageToolBar";
        
                const botNameSpan = document.createElement("span"); 
                botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                botNameSpan.className = "chatbotName";
        
                const messageBlockDiv = document.createElement("div");
                messageBlockDiv.className = "messageBlock";

                let botP = '';

                const messageText = messageData.content;
                if (messageHistory.length >= 2) {
                    if (ANTHROPIC_MODELS.includes(this.settings.model)) {
                        const cleanString = messageText.split(' ').slice(1).join(' ').trim();
                        botP = marked(cleanString);
                    } else if (messageData.content.includes('div class="formattedSettings"')) {
                        botP = messageData.content;
                    } 
                    else {
                        botP = marked(messageData.content);
                    }                                  
                }

                const newBotP = document.createElement('p');
                newBotP.innerHTML = botP;

                botMessageToolBarDiv.appendChild(botNameSpan);
                botMessageToolBarDiv.appendChild(buttonContainerDiv);

                if (!messageText.includes('div class="formattedSettings"')) {
                    const copyBotButton = displayBotCopyButton(messageData, this.settings);
                    const appendButton = displayAppendButton(messageData);
                    buttonContainerDiv.appendChild(copyBotButton);
                    buttonContainerDiv.appendChild(appendButton);
                }
                botMessageDiv.appendChild(botMessageToolBarDiv);
                messageBlockDiv.appendChild(newBotP);
                botMessageDiv.appendChild(messageBlockDiv);
                messageContainer.appendChild(botMessageDiv);
                
                prismHighlighting(messageBlockDiv);
                codeBlockCopyButton(messageBlockDiv);
                if (!messageData.content.includes('div class="formattedSettings"')){
                    addParagraphBreaks(messageBlockDiv);        
                }
                const botMessages = messageContainer.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];

                lastBotMessage.appendChild(messageBlockDiv);
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

    async handleFileOpenEvent(file: TFile) {
        await getActiveFileContent(file);
    }
    
    async handleKeyup(event: KeyboardEvent) {
        const input = this.textareaElement.value.trim();
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            if (this.settings.allowReferenceCurrentNote) {
                referenceCurrentNoteContent = await getActiveFileContent(activeFile);
            }
        }

        // Only allow /stop command to be executed during fetch
        if (this.settings.allowOllamaStream || !this.settings.ollamaModels.includes(this.settings.model)) {
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

            if (ANTHROPIC_MODELS.includes(this.settings.model)) {
                addMessage('\n\nHuman: ' + input, 'userMessage', this.settings);
            } else {
                if (!(input === "/s" || input === "/stop")) {
                    addMessage(input, 'userMessage', this.settings);
                }
            }
            
            const userP = document.createElement("p");
            const markdownContent = marked(input);
            userP.innerHTML = markdownContent;
            
            
            const userMessageDiv = document.createElement("div");
            userMessageDiv.className = "userMessage";
            userMessageDiv.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || 
                getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
            
            const userMessageToolBarDiv = document.createElement("div");
            userMessageToolBarDiv.className = "userMessageToolBar";
            
            const userNameSpan = document.createElement("span");
            userNameSpan.className = "userName";
            userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;

            const buttonContainerDiv = document.createElement("div");
            buttonContainerDiv.className = "button-container";
            
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                const userMessages = messageContainer.querySelectorAll(".userMessage");
                // Clear any existing regenerate buttons
                userMessages.forEach(message => {
                    const existingRegenerateButton = message.querySelector(".regenerate-button");
                    if (existingRegenerateButton) {
                        existingRegenerateButton.remove();
                    }
                });
                const regenerateButton = regenerateUserButton(this.settings, referenceCurrentNoteContent);
                const copyUserButton = displayUserCopyButton(userP);
                const trashButton = displayTrashButton();

                userMessageToolBarDiv.appendChild(userNameSpan);
                userMessageToolBarDiv.appendChild(buttonContainerDiv);
                if (!input.startsWith("/")) {
                    buttonContainerDiv.appendChild(regenerateButton);
                }
                buttonContainerDiv.appendChild(copyUserButton);
                buttonContainerDiv.appendChild(trashButton);
                userMessageDiv.appendChild(userMessageToolBarDiv);
                userMessageDiv.appendChild(userP);
                messageContainer.appendChild(userMessageDiv);

                if (input.startsWith("/")) {
    
                    executeCommand(input, this.settings, this.plugin);
                    const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                    if (modelName) {
                        modelName.textContent = 'Model: ' + this.settings.model.toLowerCase();
                    }
                }   
                else {
                    this.preventEnter = true;
                    const botMessageDiv = document.createElement("div");
                    botMessageDiv.className = "botMessage";
                    botMessageDiv.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor ||
                        getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());

                    const botMessageToolBarDiv = document.createElement("div");
                    botMessageToolBarDiv.className = "botMessageToolBar";

                    const botNameSpan = document.createElement("span"); 
                    botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                    botNameSpan.className = "chatbotName";

                    const messageBlockDiv = document.createElement("div");
                    messageBlockDiv.className = "messageBlock";

                    botMessageToolBarDiv.appendChild(botNameSpan);
                    botMessageDiv.appendChild(botMessageToolBarDiv);
                    botMessageDiv.appendChild(messageBlockDiv);
                    messageContainer.appendChild(botMessageDiv);

                    const loadingEl = document.createElement("span");
                    loadingEl.setAttribute("id", "loading"); 
                    loadingEl.style.display = "inline-block"; 
                    loadingEl.textContent = "..."; 

                    // Define a function to update the loading animation
                    const updateLoadingAnimation = () => {
                        const loadingEl = document.querySelector('#loading');
                        if (!loadingEl) {
                            return;
                        }
                        loadingEl.textContent += ".";
                        // If the loading animation has reached three dots, reset it to one dot
                        if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
                            loadingEl.textContent = ".";
                        }
                    };  

                    // Dispaly loading animation
                    botMessageDiv.appendChild(loadingEl);
                    loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });

                    const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

                    userMessageDiv.scrollIntoView({ behavior: "smooth", block: "start" });

                    // Call the chatbot function with the user's input
                    this.BMOchatbot(input)
                        .then(() => {
                            this.preventEnter = false;
                            clearInterval(loadingAnimationIntervalId);
                        })
                        .catch(() => {
                            // Stop the loading animation and update the bot message with an error message
                            clearInterval(loadingAnimationIntervalId);
                            const botParagraph = document.createElement("p");
                            botParagraph.textContent = "Oops, something went wrong. Please try again.";
                            botMessageDiv.appendChild(botParagraph);
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
        const updateCursorPosition = () => {
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

        // Clear the loading animation interval if it's active
        if (this.loadingAnimationIntervalId) {
            clearInterval(this.loadingAnimationIntervalId);
        }
    }

    async BMOchatbot(_input: string) {
        referenceCurrentNoteContent = ''; // Clear reference current note content every time BMOchatbot is called
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            if (this.settings.allowReferenceCurrentNote) {
                referenceCurrentNoteContent = await getActiveFileContent(activeFile);
            }
        }

        const messageContainerEl = document.querySelector('#messageContainer');
        const chatbotNameHeading = document.querySelector('#chatbotNameHeading');

        const chatbox = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;

        // If apiKey does not exist.
        if (!this.settings.apiKey && OPENAI_MODELS.includes(this.settings.model)) {
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
            // Fetch OpenAI API
            if (OPENAI_MODELS.includes(this.settings.model)) {
                try {
                    await fetchOpenAIAPI(this.settings, referenceCurrentNoteContent); 
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (this.settings.ollamaRestAPIUrl && this.settings.ollamaModels.includes(this.settings.model)) {
                if (this.settings.allowOllamaStream) {
                    await ollamaFetchDataStream(this.settings, referenceCurrentNoteContent);
                }
                else {
                    await ollamaFetchData(this.settings, referenceCurrentNoteContent);
                }
            }
            else if (this.settings.openAIRestAPIUrl && this.settings.openAIRestAPIModels.includes(this.settings.model)){
                try {
                    if (this.settings.allowOpenAIRestAPIStream) {
                        await openAIRestAPIFetchDataStream(this.settings, referenceCurrentNoteContent);
                    }
                    else {
                        await openAIRestAPIFetchData(this.settings, referenceCurrentNoteContent);
                    }
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (this.plugin.settings.openAIBaseModels.includes(this.settings.model)) {
                try {
                    await fetchOpenAIBaseAPI(this.settings, referenceCurrentNoteContent); 
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (ANTHROPIC_MODELS.includes(this.settings.model)) {
                try {
                    await requestUrlAnthropicAPI(this.settings, referenceCurrentNoteContent);
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
            else {
                new Notice("No models detected.");
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