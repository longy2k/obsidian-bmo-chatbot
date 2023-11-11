import { ItemView, WorkspaceLeaf, Notice, setIcon, requestUrl, loadPrism, TFile, Modal } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import { colorToHex } from "./settings";
import { marked } from "marked";
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from "openai/resources/chat";
// import * as commands from './commands';
import { executeCommand } from "./commands";
import BMOGPT from './main';

export const VIEW_TYPE_CHATBOT = "chatbot-view";
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';
export let messageHistory: { role: string; content: string }[] = [];

export function clearMessageHistory() {
    messageHistory = [];
}

let messageHistoryContent: { role: string; content: string }[] = [];

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
    }

    getViewType() {
        return VIEW_TYPE_CHATBOT;
    }

    getDisplayText() {
        return "Chatbot";
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
        
        chatbotContainer.createEl("h1", { 
            text: this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName,
            attr: {
                id: "chatbotNameHeading"
            }
        });

        chatbotContainer.createEl("p", {
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
            if (this.settings.referenceCurrentNote) {
                referenceCurrentNoteElement.style.display = 'block';
            } else {
                referenceCurrentNoteElement.style.display = 'none';
            }
        }
    
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.getActiveFileContent(activeFile);
        }

        const messageContainer = chatbotContainer.createEl("div", {
            attr: {
                id: "messageContainer",
            },
        });
        
        await loadData();
        
        messageContainer.id = "messageContainer";
        
        messageHistory.forEach((messageData, index) => {

            const dropdownOptions = document.createElement("ul");
            dropdownOptions.setAttribute("id", "dropdownOptions");

            const ellipsisLink = document.createElement("a");
            ellipsisLink.href = "#";
        
            const elipsesSpan = document.createElement("span");
            elipsesSpan.setAttribute("id", "elipses");
            elipsesSpan.textContent = "...";
            elipsesSpan.style.float = "right";
              

            if (messageData.role == "user") {
                const userMessageDiv = document.createElement("div");
                userMessageDiv.className = "userMessage";
                userMessageDiv.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
            
                const userNameSpan = document.createElement("span");
                userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
                userNameSpan.setAttribute("id", "userName");
                userMessageDiv.appendChild(userNameSpan);

                const userP = document.createElement("p");
            
                // Add a click event listener to the ellipsis span to toggle the dropdown
                elipsesSpan.addEventListener("click", function (event) {
                    event.stopPropagation();
                    const wasOpen = dropdownOptions.classList.contains("dropdownOptionsOpen");
                    hideAllDropdowns();
                    if (!wasOpen) {
                        dropdownOptions.style.display = "block";
                        dropdownOptions.classList.add("dropdownOptionsOpen");
                    }
                });
                
            
                // Add a click event listener to the document to hide the dropdown when clicking outside
                document.addEventListener("click", function (event) {
                    if (!(event.target instanceof HTMLElement && (event.target.id === "elipses" || event.target.id === "dropdownOptions" || event.target.closest("#dropdownOptions")))) {
                        hideAllDropdowns();
                    }
                });
            
                if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                    const fullString = messageData.content;
                    const cleanString = fullString.split(' ').slice(1).join(' ').trim();
                    userP.innerHTML = marked(cleanString);
                } else {
                    userP.innerHTML = marked(messageData.content);
                }

                const option1 = document.createElement("li");
                option1.textContent = "Copy User Message";
                option1.addEventListener("click", function () {
                    const messageText = userP.textContent;
            
                    if (messageText !== null) {
                        copyMessageToClipboard(messageText);
                        new Notice('Copied User Message');
                        hideAllDropdowns();
                    } else {
                        console.error('Message content is null. Cannot copy.');
                    }
                });
                dropdownOptions.appendChild(option1);

                // Check if the next message in the history is from the assistant
                if (index + 1 < messageHistory.length && messageHistory[index + 1].role == "assistant") {
                    const botMessageData = messageHistory[index + 1];
                    const botP = document.createElement("p");
                    let messageText = botMessageData.content;
                    if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                        const fullString = botMessageData.content;
                        const cleanString = fullString.split(' ').slice(1).join(' ').trim();
                        botP.innerHTML = marked(cleanString);
                        messageText = cleanString;
                    } else {
                        botP.innerHTML = marked(botMessageData.content);
                    }

                    const option2 = document.createElement("li");
                    option2.textContent = "Copy Bot Message";
                    option2.addEventListener("click", function () {
                        if (messageText !== null) {
                            copyMessageToClipboard(messageText);
                            new Notice('Copied Bot Message');
                            hideAllDropdowns();
                        } else {
                            console.error('Message content is null. Cannot copy.');
                        }
                    });
                    dropdownOptions.appendChild(option2);
                }

                const modal = new Modal(this.app);

                const option3 = document.createElement("li");
                option3.innerHTML = "Delete Thread";
                option3.addEventListener("click", function () {
                    modal.contentEl.innerHTML = `
                        <div class="modal-content">
                            <h2>Delete Thread</h2>
                            <p>Are you sure you want to delete this thread?</p>
                            <button id="confirmDelete">Confirm Delete</button>
                        </div>
                    `;
                
                    const confirmDeleteButton = modal.contentEl.querySelector("#confirmDelete");
                    confirmDeleteButton?.addEventListener("click", async function () {
                        removeMessageThread(index);
                        new Notice('Thread Deleted');
                        hideAllDropdowns();
                        modal.close();
                    });
                
                    modal.open();
                });
                
                dropdownOptions.appendChild(option3);
                
                ellipsisLink.appendChild(elipsesSpan);
                userNameSpan.appendChild(ellipsisLink);
                userMessageDiv.appendChild(userNameSpan);
                userMessageDiv.appendChild(dropdownOptions);
                userMessageDiv.appendChild(userP);
                messageContainer.appendChild(userMessageDiv);
            }
        
            if (messageData.role == "assistant") {
                const botMessageDiv = document.createElement("div");
                botMessageDiv.className = "botMessage";
                botMessageDiv.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
        
                const botNameSpan = document.createElement("span"); 
                botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                botNameSpan.setAttribute("id", "chatbotName")
                botMessageDiv.appendChild(botNameSpan);
        
                const messageBlockDiv = document.createElement("div");
                messageBlockDiv.className = "messageBlock";

                let botP = '';

                if (messageHistory.length >= 2) {
                    if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                        const fullString = messageData.content;
                        const cleanString = fullString.split(' ').slice(1).join(' ').trim();
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

                // Append the paragraph element to messageBlockDiv
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
        await this.getActiveFileContent(file);
    }
    
    async handleKeyup(event: KeyboardEvent) {

        if (this.preventEnter === false && !event.shiftKey && event.key === "Enter") {
            loadData();
            event.preventDefault();
            const input = this.textareaElement.value.trim();
            if (input.length === 0) {
                return;
            }

                const dropdownOptions = document.createElement("ul");
                dropdownOptions.setAttribute("id", "dropdownOptions");
        
                const ellipsisLink = document.createElement("a");
                ellipsisLink.href = "#";
            
                const elipsesSpan = document.createElement("span");
                elipsesSpan.setAttribute("id", "elipses");
                elipsesSpan.textContent = "...";
                elipsesSpan.style.float = "right";
                
                const userMessage = document.createElement("div");
                userMessage.classList.add("userMessage");
                userMessage.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
                
                const userNameSpan = document.createElement("span");
                userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
                userNameSpan.setAttribute("id", "userName");
                userMessage.appendChild(userNameSpan);
                
                if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                    addMessage('\n\nHuman: ' + input, 'userMessage', this.settings);
                } else {
                    addMessage(input, 'userMessage', this.settings);
                }
                
                const userParagraph = document.createElement("p");
                const markdownContent = marked(input);
                userParagraph.innerHTML = markdownContent;

                const option1 = document.createElement("li");
                option1.textContent = "Copy User Message";
                option1.addEventListener("click", function () {
                    const messageText = input;
            
                    if (messageText !== null) {
                        copyMessageToClipboard(messageText);
                        new Notice('Copied User Message');
                        hideAllDropdowns();
                    } else {
                        new Notice('Message content is null. Cannot copy.');
                        console.error('Message content is null. Cannot copy.');
                    }
                });
                dropdownOptions.appendChild(option1);

                let lastClickedElement: HTMLElement | null = null;

                // Add a click event listener to the ellipsis span to toggle the dropdown
                elipsesSpan.addEventListener("click", function (event) {
                    event.stopPropagation();
                    const wasOpen = dropdownOptions.classList.contains("dropdownOptionsOpen");
                    hideAllDropdowns();
                    if (!wasOpen) {
                        dropdownOptions.style.display = "block";
                        dropdownOptions.classList.add("dropdownOptionsOpen");
                    }
                    lastClickedElement = event.target as HTMLElement;

                    while (lastClickedElement && !lastClickedElement.classList.contains('userMessage')) {
                        lastClickedElement = lastClickedElement.parentElement;
                    }

                    if (lastClickedElement) {
                        const userMessages = Array.from(document.querySelectorAll('#messageContainer .userMessage'));
                    
                        const index = userMessages.indexOf(lastClickedElement) * 2;
                    
                        if (index !== -1) {
                            const modal = new Modal(app);
                    
                            if (!Array.from(dropdownOptions.children).find(option => option.textContent === "Delete Thread")) {
                                const option3 = document.createElement("li");
                                option3.innerHTML = "Delete Thread";
                                option3.addEventListener("click", function () {
                                    modal.contentEl.innerHTML = `
                                        <div class="modal-content">
                                            <h2>Delete Thread</h2>
                                            <p>Are you sure you want to delete this thread?</p>
                                            <button id="confirmDelete">Confirm Delete</button>
                                        </div>
                                    `;
                    
                                    const confirmDeleteButton = modal.contentEl.querySelector("#confirmDelete");
                                    confirmDeleteButton?.addEventListener("click", async function () {
                                        removeMessageThread(index);
                                        new Notice('Thread Deleted');
                                        hideAllDropdowns();
                                        modal.close();
                                    });
                    
                                    modal.open();
                                });
                    
                                dropdownOptions.appendChild(option3);
                            }
                        }
                    }
                    
                });
                
            
                // Add a click event listener to the document to hide the dropdown when clicking outside
                document.addEventListener("click", function (event) {
                    if (!(event.target instanceof HTMLElement && (event.target.id === "elipses" || event.target.id === "dropdownOptions" || event.target.closest("#dropdownOptions")))) {
                        hideAllDropdowns();
                    }
                });

                const messageContainer = document.querySelector("#messageContainer");
                if (messageContainer) {
                    ellipsisLink.appendChild(elipsesSpan);
                    userNameSpan.appendChild(ellipsisLink);
                    userMessage.appendChild(userNameSpan);
                    userMessage.appendChild(dropdownOptions);
                    userMessage.appendChild(userParagraph);
                    messageContainer.appendChild(userMessage);
                    

                    if (input.startsWith("/")) {
        
                        executeCommand(input, this.settings, this.plugin);
                        const modelName = document.querySelector('#modelName') as HTMLHeadingElement;
                        if (modelName) {
                            modelName.textContent = 'Model: ' + this.settings.model.toLowerCase();
                        }


                    }   
                    else {
                        const botMessage = document.createElement("div");
                        botMessage.classList.add("botMessage");
                        botMessage.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
                        messageContainer.appendChild(botMessage);
                    
                        const botNameSpan = document.createElement("span"); 
                        botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                        botNameSpan.setAttribute("id", "chatbotName")
                        botMessage.appendChild(botNameSpan);

                        const messageBlock = document.createElement("div");
                        messageBlock.classList.add("messageBlock");
                        botMessage.appendChild(messageBlock);

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

                        if (!["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4-1106-preview"].includes(this.settings.model)) {
                            botMessage.appendChild(loadingEl);
                            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }

                        const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

                        // Create a spacer element for scrolling most recent userMessage/botMessage to
                        const spacer = document.createElement("div");
                        spacer.setAttribute("id", "spacer");
                        messageContainer.appendChild(spacer);

                        userMessage.scrollIntoView({ behavior: "smooth", block: "start" });

                        this.preventEnter = true;
                        // Call the chatbot function with the user's input
                        this.BMOchatbot(input)
                            .then(() => {
                                const spacer = messageContainer.querySelector("#spacer");
                                if (spacer) {
                                    spacer.remove();
                                }
                                this.preventEnter = false;
                                clearInterval(loadingAnimationIntervalId);
                            })
                            .catch(() => {
                                // Stop the loading animation and update the bot message with an error message
                                clearInterval(loadingAnimationIntervalId);
                                const botParagraph = document.createElement("p");
                                botParagraph.textContent = "Oops, something went wrong. Please try again.";
                                botMessage.appendChild(botParagraph);
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
        let referenceCurrentNote = '';

        const activeFile = this.app.workspace.getActiveFile();

        if (activeFile) {
            if (this.settings.referenceCurrentNote) {
                referenceCurrentNote = await this.getActiveFileContent(activeFile);
            }
        }

        const messageContainerEl = document.querySelector('#messageContainer');
        const chatbotNameHeading = document.querySelector('#chatbotNameHeading');
        const chatbox = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;

        // If apiKey does not exist.
        if (!this.settings.apiKey && ["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4-1106-preview"].includes(this.settings.model)) {
            new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
            if (chatbotNameHeading){
                chatbotNameHeading.textContent = "ERROR";
            }

            const lastDiv = messageContainerEl?.lastElementChild as HTMLDivElement;
            const errorMessage = document.createElement('p');
            errorMessage.textContent = "API key not found. Please add your OpenAI API key in the plugin settings.";
            errorMessage.classList.add('errorMessage');
            const chatbotNameError = lastDiv.querySelector('#chatbotName') as HTMLDivElement;
            chatbotNameError.textContent = "ERROR";
            lastDiv.appendChild(errorMessage);
            chatbox.disabled = true;
        } 
        else {
            let systemReferenceCurrentNote = '';

            if (this.settings.referenceCurrentNote) {
                systemReferenceCurrentNote = 'Refer to note if asked.'
            }

            const maxTokens = this.settings.max_tokens;
            const temperature = this.settings.temperature;
            const settings = {
                apiKey: this.settings.apiKey,
                model: this.settings.model,
                system_role: systemReferenceCurrentNote + this.settings.system_role
            };

            // OpenAI models
            if (["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4-1106-preview"].includes(this.settings.model)) {
                try {
                    await fetchOpenAIAPI(this.settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature); 
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                    console.log("messageHistory: " + messageHistory);
                }
            }
            else if (["claude-2.0", "claude-instant-1.2"].includes(this.settings.model)) {
                try {
                    const url = 'https://api.anthropic.com/v1/complete';
                    const response = await requestUrlAnthropicAPI(url, this.settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature);

                    const message = response.text;
                    const lines = message.split('\n');
                    let completionText = '';
                
                    for (const line of lines) {
                      if (line.startsWith('data:')) {
                        const eventData = JSON.parse(line.slice('data:'.length));
                        if (eventData.completion) {
                          completionText += eventData.completion;
                        }
                      }
                    }

                    if (messageContainerEl) {
                        const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                        const lastBotMessage = botMessages[botMessages.length - 1];
                        const loadingEl = lastBotMessage.querySelector("#loading");
                        
                        if (loadingEl) {
                            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            lastBotMessage.removeChild(loadingEl);
                        }

                        const messageBlock = lastBotMessage.querySelector('.messageBlock');

                        if (messageBlock) {
                            messageBlock.innerHTML = marked(completionText);
                        
                            addParagraphBreaks(messageBlock);
                            prismHighlighting(messageBlock);
                            codeBlockCopyButton(messageBlock);
                        }
                        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }

                    addMessage('\n\nAssistant: ' + completionText, 'botMessage', this.settings);
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
            else {
                try { 
                    const response = await requestUrlChatCompletion(this.settings.restAPIUrl, settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature);
                
                    const message = response.json.choices[0].message.content;

                    addMessage(message, 'botMessage', this.settings);

                    if (messageContainerEl) {
                        const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                        const lastBotMessage = botMessages[botMessages.length - 1];
                        const loadingEl = lastBotMessage.querySelector("#loading");
                        
                        if (loadingEl) {
                            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            lastBotMessage.removeChild(loadingEl);
                        }
                    
                        const messageBlock = document.createElement("p");
                        const markdownContent = marked(message);
                        messageBlock.innerHTML = markdownContent;
                        messageBlock.classList.add("messageBlock");
                        
                        addParagraphBreaks(messageBlock);
                        prismHighlighting(messageBlock);
                        codeBlockCopyButton(messageBlock);
                        
                        lastBotMessage.appendChild(messageBlock);
                        lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } 
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                    console.log("messageHistory: " + messageHistory);
                }
            }
        }
        console.log("BMO settings:", this.settings);
    }

    // Reference Current Note
    async getActiveFileContent(file: TFile) {
        const activeFile = this.app.workspace.getActiveFile();
        const dotElement = document.querySelector('.dotIndicator');
        let currentNote = '';
        if (activeFile?.extension === 'md') {
            const content = await this.app.vault.read(activeFile);
            currentNote = 'Note:```' + content + '```\n';
            if (dotElement) {
                (dotElement as HTMLElement).style.backgroundColor = 'green';
            }
        } else {
            if (dotElement) {
                (dotElement as HTMLElement).style.backgroundColor = '#da2c2c';
            }
        }
        return currentNote;
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

// Add a new message to the messageHistory array and save it to the file
export async function addMessage(input: string, messageType: 'userMessage' | 'botMessage', settings: BMOSettings, index?: number) {
    const messageObj: { role: string; content: string } = {
        role: "",
        content: ""
    };

    if (messageType === 'userMessage') {
        messageObj.role = 'user';
        messageObj.content = input;
    } else if (messageType === 'botMessage') {
        messageObj.role = 'assistant';  
        messageObj.content = input;

        const dropdowns = document.querySelectorAll("#dropdownOptions");
        const dropdownOptions = dropdowns[dropdowns.length - 1];

        if (dropdowns.length > 0) {
            const option2 = document.createElement("li");
            option2.textContent = "Copy Bot Message";   
            option2.addEventListener("click", function () {
                let messageText = messageObj.content;
        
                if (messageText !== null) {
                    if (["claude-instant-1.2", "claude-2.0"].includes(settings.model)) {
                        const fullString = messageObj.content;
                        const cleanString = fullString.split(' ').slice(1).join(' ').trim();
                        messageText = cleanString;
                        copyMessageToClipboard(messageText);
                    }
                    else {
                        copyMessageToClipboard(messageText);
                    }
                    new Notice('Copied Bot Message');
                    hideAllDropdowns();
                } else {
                    new Notice('Message content is null. Cannot copy.');
                    console.error('Message content is null. Cannot copy.');
                }
            });
            dropdownOptions.appendChild(option2);
        }

    }

    messageHistory.push(messageObj);

    messageHistoryContent = messageHistory.map(item => {
        return {
            role: item.role,
            content: item.content
        };
    });

    const jsonString = JSON.stringify(messageHistoryContent, null, 4);

    try {
        await this.app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error("Error writing to message history file:", error);
    }
}


async function fetchOpenAIAPI(
    settings: BMOSettings,
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string,
    temperature: number) 
    {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.openAIBaseUrl,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const messageHistory = messageHistoryContent.map(item => ({
        role: item.role,
        content: item.content,
    })) as ChatCompletionMessageParam[];

    try {
        const stream = await openai.chat.completions.create({
            model: settings.model,
            max_tokens: parseInt(maxTokens),
            temperature: temperature,
            messages: [
                { role: 'system', content: referenceCurrentNote + settings.system_role },
                ...messageHistory
            ],
            stream: true,
        });

        let message = '';

        for await (const part of stream) {
            const content = part.choices[0]?.delta?.content || '';

            message += content;

            const messageContainerEl = document.querySelector('#messageContainer');
            if (messageContainerEl) {
                const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                const lastBotMessage = botMessages[botMessages.length - 1];

                const messageBlock = lastBotMessage.querySelector('.messageBlock');

                if (messageBlock) {
                    messageBlock.innerHTML = marked(message);

                    addParagraphBreaks(messageBlock);
                    prismHighlighting(messageBlock);
                    codeBlockCopyButton(messageBlock);
                }
            }
        }

        addMessage(message, 'botMessage', settings);
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];

            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {
                messageBlock.innerHTML = marked(error.response?.data?.error || error.message);
                addMessage(messageBlock.innerHTML, 'botMessage', settings);
            }
        }
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Request response from Anthropic 
async function requestUrlAnthropicAPI(
    url: string,
    settings: BMOSettings,
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string,
    temperature: number) 
    {
    const headers = {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
    };
  
    const messageHistoryString = messageHistoryContent.map(entry => entry.content).join('\n');

    const requestBody = {
        model: settings.model,
        prompt:  `\n\nHuman: ${referenceCurrentNote}\n\n${settings.system_role}\n\n${messageHistoryString}\n\nAssistant:`,
        max_tokens_to_sample: parseInt(maxTokens) || 100000,
        temperature: temperature,
        stream: true,
    };
  
    try {
      const response = await requestUrl({
        url,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
  
      return response;
  
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];

            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {
                messageBlock.innerHTML = 'Max tokens overflow. Please reduce max_tokens or clear chat messages. We recommend clearing max_tokens for best results.';
                addMessage(messageBlock.innerHTML, 'botMessage', settings);

                const loadingEl = lastBotMessage.querySelector("#loading");
                if (loadingEl) {
                    loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    lastBotMessage.removeChild(loadingEl);
                }
            }
        }
      console.error('Error making API request:', error);
      throw error;
    }
}

// Request response from self-hosted models
async function requestUrlChatCompletion(
    url: string, 
    settings: { apiKey: string; model: string; system_role: string; }, 
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string, 
    temperature: number)
    {
        const messageHistory = messageHistoryContent.map((item: { role: string; content: string; }) => ({
            role: item.role,
            content: item.content,
        }));

        try {
            const response = await requestUrl({
                url: url + '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: [
                        { role: 'system', content: referenceCurrentNote + settings.system_role },
                        ...messageHistory
                    ],
                    max_tokens: parseInt(maxTokens),
                    temperature: temperature,
                }),
            });

            return response;

        } catch (error) {
            console.error('Error making API request:', error);
            throw error;
        }
}

// Handle Prisma Highlighting for code blocks
function prismHighlighting(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
        loadPrism().then((Prism) => {
        const codeBlocks = messageBlock?.querySelectorAll('.messageBlock pre code');

        codeBlocks?.forEach((codeBlock: { className: string; textContent: any; innerHTML: any; }) => {
            const language = codeBlock.className.replace("language-", "");
            const code = codeBlock.textContent;
            
            if (language && Prism.languages[language]) {
                const highlightedCode = Prism.highlight(code, Prism.languages[language]);
                codeBlock.innerHTML = highlightedCode;
            }
        });
    });
}

// Copy button for code blocks
function codeBlockCopyButton(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
    const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');
    codeBlocks.forEach((codeElement: { parentNode: { insertBefore: (arg0: HTMLButtonElement, arg1: any) => void; }; nextSibling: any; textContent: any; }) => {
        const copyButton = document.createElement("button");
        copyButton.textContent = "copy";
        setIcon(copyButton, "copy");
        copyButton.classList.add("copy-button");
        copyButton.title = "copy";
        if (codeElement.parentNode) {
            codeElement.parentNode.insertBefore(copyButton, codeElement.nextSibling);
        }
        copyButton.addEventListener("click", () => {
            const codeText = codeElement.textContent;
            if (codeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    new Notice('Copied to your clipboard');
                }, (err) => {
                    console.error("Failed to copy code: ", err);
                });
            }
        });
    });
}

// Add line break between consecutive <p> elements
function addParagraphBreaks(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
    const paragraphs = messageBlock.querySelectorAll("p");
    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const nextSibling = p.nextElementSibling;
        if (nextSibling && nextSibling.nodeName === "P") {
            const br = document.createElement("br");
            const parent = p.parentNode;
            if (parent) {
                parent.insertBefore(br, nextSibling);
            }
        }
    }
}

function copyMessageToClipboard(message: string) {
    navigator.clipboard.writeText(message).then(function() {
    //   console.log('Message copied to clipboard');
    }).catch(function(err) {
      console.error('Unable to copy message: ', err);
    });
  }

// eslint-disable-next-line no-inner-declarations
function hideAllDropdowns(exceptDropdown: HTMLElement | null = null) {
const openDropdowns = document.querySelectorAll("#dropdownOptions");
openDropdowns.forEach((dropdown) => {
    if (dropdown !== exceptDropdown && dropdown instanceof HTMLElement) {
        dropdown.classList.remove("dropdownOptionsOpen");
        dropdown.style.display = "none";
    }});
}

export async function removeMessageThread(index: number) {
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
        await app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error('Error writing messageHistory.json', error);
    }
}

