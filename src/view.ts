import { ItemView, WorkspaceLeaf, Notice, setIcon, loadPrism, TFile, Modal } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import BMOGPT from './main';
import { colorToHex } from "./utils/ColorConverter";
import { fetchOpenAIAPI, ollamaFetchData, ollamaFetchDataStream, requestUrlAnthropicAPI, requestUrlChatCompletion } from "./components/models";
import { executeCommand } from "./components/commands";
import { marked } from "marked";

export const VIEW_TYPE_CHATBOT = "chatbot-view";
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';

export const ANTHROPIC_MODELS = ["claude-instant-1.2", "claude-2.0", "claude-2.1"];
export const OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-3.5-turbo-1106", "gpt-4", "gpt-4-1106-preview"];

export let messageHistory: { role: string; content: string }[] = [];

export function clearMessageHistory() {
    messageHistory = [];
}

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
            await getActiveFileContent(activeFile);
        }

        const messageContainer = chatbotContainer.createEl("div", {
            attr: {
                id: "messageContainer",
            },
        });
        
        await loadData();
        
        messageContainer.id = "messageContainer";
        
        messageHistory.forEach((messageData, index) => {     
            const buttonContainerDiv = document.createElement("div");
            buttonContainerDiv.className = "button-container";

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
                const trashButton = displayTrash();
                
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
                    buttonContainerDiv.appendChild(copyBotButton);
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
                const copyUserButton = displayUserCopyButton(userP);
                const trashButton = displayTrash();

                userMessageToolBarDiv.appendChild(userNameSpan);
                userMessageToolBarDiv.appendChild(buttonContainerDiv);
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

                    // Create a spacer element for scrolling most recent userMessage/botMessage to
                    const spacer = document.createElement("div");
                    spacer.setAttribute("id", "spacer");
                    messageContainer.appendChild(spacer);

                    userMessageDiv.scrollIntoView({ behavior: "smooth", block: "start" });

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
        let referenceCurrentNoteContent = '';

        const activeFile = this.app.workspace.getActiveFile();

        if (activeFile) {
            if (this.settings.referenceCurrentNote) {
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
            if (OPENAI_MODELS.includes(this.settings.model)) {
                try {
                    await fetchOpenAIAPI(this.settings, referenceCurrentNoteContent); 
                }
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
                }
            }
            else if (ANTHROPIC_MODELS.includes(this.settings.model)) {
                try {
                    const response = await requestUrlAnthropicAPI(this.settings, referenceCurrentNoteContent);

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
                    if (this.settings.ollamaRestAPIUrl) {
                        if (this.settings.allowOllamaStream) {
                            await ollamaFetchDataStream(this.settings, referenceCurrentNoteContent);
                        }
                        else {
                            await ollamaFetchData(this.settings, referenceCurrentNoteContent);
                        }
                    }
                    else {
                        const response = await requestUrlChatCompletion(this.settings.localAIRestAPIUrl, settings, referenceCurrentNoteContent, messageHistory, maxTokens, temperature);
                    
                        const message = response.json.choices[0].message.content;

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

                        addMessage(message, 'botMessage', this.settings);
                    }
                } 
                catch (error) {
                    new Notice('Error occurred while fetching completion: ' + error.message);
                    console.log(error.message);
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

// Reference Current Note
export async function getActiveFileContent(file: TFile) {
    const activeFile = app.workspace.getActiveFile();
    const dotElement = document.querySelector('.dotIndicator');
    let currentNote = '';
    if (activeFile?.extension === 'md') {
        const content = await app.vault.read(activeFile);
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

        const botMessageToolBarDiv = document.querySelectorAll(".botMessageToolBar");
        const lastBotMessageToolBarDiv = botMessageToolBarDiv[botMessageToolBarDiv.length - 1];
        if (botMessageToolBarDiv.length > 0) {
            if (!messageObj.content.includes('div class="formattedSettings"')) {
                const copyBotButton = displayBotCopyButton(messageObj, settings);
                lastBotMessageToolBarDiv.appendChild(copyBotButton);
            }
        }

    }

    messageHistory.push(messageObj);

    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await this.app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error("Error writing to message history file:", error);
    }
}

// Handle Prisma Highlighting for code blocks
export function prismHighlighting(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
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
export function codeBlockCopyButton(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
    const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');
    codeBlocks.forEach((codeElement: HTMLElement) => {
        const copyButton = document.createElement("button");
        copyButton.textContent = "copy";
        setIcon(copyButton, "copy");
        copyButton.classList.add("copy-button");
        copyButton.title = "copy";
        if (codeElement.parentNode) {
            codeElement.parentNode.insertBefore(copyButton, codeElement.nextSibling);
        }
        copyButton.addEventListener("click", () => {
            // Extract the language from the class attribute
            const language = codeElement.getAttribute('class')?.replace('language-', '') || '';
            // Format the code text in markdown code block syntax
            const codeText = `\`\`\`${language}\n${codeElement.textContent}\`\`\``;
            if (codeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    new Notice('Copied codeblock.');
                }, (err) => {
                    console.error("Failed to copy code: ", err);
                    new Notice("Failed to copy code: ", err);
                });
            }
        });
    });
}

// Add line break between consecutive <p> elements
export function addParagraphBreaks(messageBlock: { querySelectorAll: (arg0: string) => any; }) {
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

export function copyMessageToClipboard(message: string) {
    navigator.clipboard.writeText(message).then(function() {
    //   console.log('Message copied to clipboard');
    }).catch(function(err) {
      console.error('Unable to copy message: ', err);
    });
}

function displayUserCopyButton (userP: HTMLParagraphElement) {
    const copyButton = document.createElement("button");
    copyButton.textContent = "copy";
    setIcon(copyButton, "copy");
    copyButton.classList.add("copy-button");
    copyButton.title = "copy";

    copyButton.addEventListener("click", function () {
        const messageText = userP.textContent;

        if (messageText !== null) {
            copyMessageToClipboard(messageText);
            new Notice('Copied user message.');
        } else {
            console.error('Message content is null. Cannot copy.');
        }
    });
    return copyButton;
}

function displayBotCopyButton (messageObj: {role: string; content: string;}, settings: BMOSettings) {
    const copyButton = document.createElement("button");
    copyButton.textContent = "copy";
    setIcon(copyButton, "copy");
    copyButton.classList.add("copy-button");
    copyButton.title = "copy";

    let messageText = messageObj.content;

    if (messageText !== null) {
        if (ANTHROPIC_MODELS.includes(settings.model)) {
            const fullString = messageObj.content;
            const cleanString = fullString.split(' ').slice(1).join(' ').trim();
            messageText = cleanString;
        } 
    } else {
        new Notice('Message content is null. Cannot copy.');
        console.error('Message content is null. Cannot copy.');
    }

    copyButton.addEventListener("click", function () {
        if (messageText !== null) {
            copyMessageToClipboard(messageText);
            new Notice('Copied bot message.');
        } else {
            console.error('Message content is null. Cannot copy.');
        }
    });
    return copyButton;
}

function displayTrash () {
    const trashButton = document.createElement("button");
    trashButton.textContent = "trash";
    setIcon(trashButton, "trash");
    trashButton.classList.add("trash-button");
    trashButton.title = "trash";

    let lastClickedElement: HTMLElement | null = null;

    // Add a click event listener to the ellipsis span to toggle the dropdown
    trashButton.addEventListener("click", function (event) {
        event.stopPropagation();
        lastClickedElement = event.target as HTMLElement;

        while (lastClickedElement && !lastClickedElement.classList.contains('userMessage')) {
            lastClickedElement = lastClickedElement.parentElement;
        }

        if (lastClickedElement) {
            const userMessages = Array.from(document.querySelectorAll('#messageContainer .userMessage'));
        
            const index = userMessages.indexOf(lastClickedElement) * 2;
        
            if (index !== -1) {
                const modal = new Modal(app);
                
                modal.contentEl.innerHTML = `
                <div class="modal-content">
                    <h2>Delete Message Block.</h2>
                    <p>Are you sure you want to delete this message block?</p>
                    <button id="confirmDelete">Confirm Delete</button>
                </div>
                `;

                const confirmDeleteButton = modal.contentEl.querySelector("#confirmDelete");
                confirmDeleteButton?.addEventListener("click", async function () {
                    deleteMessage(index);
                    new Notice('Message deleted.');
                    // hideAllDropdowns();
                    modal.close();
                });

                modal.open();
        
            }
        }
        
    });
    return trashButton;
}

export async function deleteMessage(index: number) {
    const messageContainer = document.querySelector('#messageContainer');

    const divElements = messageContainer?.querySelectorAll('div.botMessage, div.userMessage');

    if (divElements && divElements.length > 0 && index >= 0 && index < divElements.length) {
        // Remove the specified message and the next one if it exists
        messageContainer?.removeChild(divElements[index]);
        // Check if the next message is from the assistant and remove it if it is
        if (index + 1 < divElements.length) {
            const nextMessage = divElements[index + 1];
            if (nextMessage.classList.contains('botMessage')) {
                messageContainer?.removeChild(nextMessage);
            }
        }
    }

    // Update the messageHistory by removing the specified index and potentially the next one
    if (messageHistory[index + 1] && messageHistory[index + 1].role === "assistant") {
        messageHistory.splice(index, 2);
    } else {
        messageHistory.splice(index, 1);
    }
    
    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error('Error writing messageHistory.json', error);
    }
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


