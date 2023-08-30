import { ItemView, WorkspaceLeaf, Notice, setIcon, requestUrl, loadPrism, TFile } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import { colorToHex } from "./settings";
import { marked } from "marked";

export const VIEW_TYPE_CHATBOT = "chatbot-view";
export let filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';
export let messageHistory: { userMessage?: string; botMessage?: string; }[] = [];

export function clearMessageHistory() {
    messageHistory = [];
}

let messageHistoryContent = '';

export class BMOView extends ItemView {
    private settings: BMOSettings;
    private textareaElement: HTMLTextAreaElement;
    private loadingAnimationIntervalId: number;
    private preventEnter = false;

    constructor(leaf: WorkspaceLeaf, settings: BMOSettings) {
        super(leaf);
        this.settings = settings;
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
                class: "dot",
                id: "markDownBoolean"
            }
        });
        
        const referenceCurrentNote = chatbotContainer.createEl("p", {
            text: "Reference Current Note",
            attr: {
                id: "referenceCurrentNote"
            }
        });

        referenceCurrentNote.appendChild(spanElement);

        const referenceCurrentNoteElement = document.getElementById('referenceCurrentNote');
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
        
        messageHistory.forEach(messageData => {
            if (messageData.userMessage) {
                const userMessageDiv = document.createElement("div");
                userMessageDiv.className = "userMessage";
                userMessageDiv.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
        
                const userNameSpan = document.createElement("span");
                userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
                userNameSpan.setAttribute("id", "userName");
                userMessageDiv.appendChild(userNameSpan);
                
                userMessageDiv.appendChild(userNameSpan);
        
                const userP = document.createElement("p");
                userP.textContent = messageData.userMessage;
                userMessageDiv.appendChild(userP);
        
                messageContainer.appendChild(userMessageDiv);
            }
        
            if (messageData.botMessage) {
                const botMessageDiv = document.createElement("div");
                botMessageDiv.className = "botMessage";
                botMessageDiv.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
        
                const botNameSpan = document.createElement("span"); 
                botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                botNameSpan.setAttribute("id", "chatbotName")
                botMessageDiv.appendChild(botNameSpan);
        
                const messageBlockDiv = document.createElement("div");
                messageBlockDiv.className = "messageBlock";
        
                const botP = document.createElement("p");
                botP.innerHTML = marked(messageData.botMessage);
                messageBlockDiv.appendChild(botP);
        
                botMessageDiv.appendChild(messageBlockDiv);
        
                messageContainer.appendChild(botMessageDiv);

                prismHighlighting(messageBlockDiv);
                codeBlockCopyButton(messageBlockDiv);
                addParagraphBreaks(messageBlockDiv);

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
            if (input.length === 0) { // check if input is empty or just whitespace
                return;
            }
            
            addMessage(input, 'userMessage');
            
            // Create a new paragraph element for each message
            const userMessage = document.createElement("div");
            userMessage.classList.add("userMessage");
            userMessage.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
            
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
            userNameSpan.setAttribute("id", "userName");
            userMessage.appendChild(userNameSpan);
            
            const userParagraph = document.createElement("p");
            const markdownContent = marked(input);
            userParagraph.innerHTML = markdownContent;
            
            userMessage.appendChild(userParagraph);

            // Append the new message to the message container
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                messageContainer.appendChild(userMessage);
            
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
                    // Add a dot to the loading animation
                    loadingEl.textContent += ".";
                    // If the loading animation has reached three dots, reset it to one dot
                    if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
                        loadingEl.textContent = ".";
                    }
                };  

                if (this.settings.model !== "gpt-3.5-turbo" && this.settings.model !== "gpt-3.5-turbo-16k" && this.settings.model !== "gpt-4") {
                    botMessage.appendChild(loadingEl);
                    loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }

                let loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

                // Create a spacer element for scrolling most recent userMessage/botMessage to
                const spacer = document.createElement("div");
                spacer.setAttribute("id", "spacer");
                messageContainer.appendChild(spacer);

                userMessage.scrollIntoView({ behavior: "smooth", block: "start" });
            
                this.preventEnter = true; // Allow user to respond after the bot responded.

                // Call the chatbot function with the user's input
                this.BMOchatbot(input)
                    .then(() => {
                        this.preventEnter = false; // Allow user to respond after the bot responded.
                        clearInterval(loadingAnimationIntervalId);

                        // Select the spacer and remove it
                        const spacer = messageContainer.querySelector("#spacer");
                        if (spacer) {
                            spacer.remove();
                        }
                    })
                    .catch(() => {
                        // Stop the loading animation and update the bot message with an error message
                        clearInterval(loadingAnimationIntervalId);
                        const botParagraph = document.createElement("p");
                        botParagraph.textContent = "Oops, something went wrong. Please try again.";
                        botMessage.appendChild(botParagraph);
                    });
                    
            }

            setTimeout(() => {
                this.textareaElement.value = "";
                this.textareaElement.style.height = "29px";
                this.textareaElement.value = this.textareaElement.value.replace(/^[\r\n]+|[\r\n]+$/gm,""); // remove newlines only at beginning or end of input
                this.textareaElement.setSelectionRange(0, 0);
            }, 0);
        }
    }

    // Prevent chatbox from increasing in height when "Enter" key is pressed.
    handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) { // check if enter key was pressed
            event.preventDefault(); // prevent default behavior
        }
    }

    // Chatbox height increase
    handleInput(event: Event) {
        this.textareaElement.style.height = "29px";
        this.textareaElement.style.height = this.textareaElement.scrollHeight + "px";
    }

    handleBlur(event: Event) {
        if (!this.textareaElement.value) {
            this.textareaElement.style.height = "29px";
        }
    }
    
    cleanup() {
        // Remove event listeners and other resources created by this.view
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

        messageHistoryContent = messageHistory.map(item => item.userMessage || item.botMessage).join("\n");

        const messageContainerEl = document.querySelector('#messageContainer');
        const chatbotNameHeading = document.querySelector('#chatbotNameHeading');
        const chatbox = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;

        // If apiKey does not exist.
        if (!this.settings.apiKey && ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(this.settings.model)) {
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

            // Self-hosted Models using LocalAI
            if (!["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(this.settings.model)) {

                try { 
                    const response = await requestUrlChatCompletion(this.settings.restAPIUrl, settings, referenceCurrentNote + messageHistoryContent, maxTokens, temperature);
                    // console.log(response.json);
                
                    let message = response.json.choices[0].message.content;

                    addMessage(message, 'botMessage');

                    if (messageContainerEl) {
                        const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                        const lastBotMessage = botMessages[botMessages.length - 1];
                        const loadingEl = lastBotMessage.querySelector("#loading");
                        
                        if (loadingEl) {
                            loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                            lastBotMessage.removeChild(loadingEl); // Remove loading message
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
            else {
                // OpenAI models
                try {
                    const url = 'https://api.openai.com';
                    const response = await fetchChatCompletion(url, settings, referenceCurrentNote + messageHistoryContent, maxTokens, temperature);
                    
                    let message = '';

                    const reader = response.body ? response.body.getReader() : null;
                    
                    if (reader) {
                    
                        while (true) {
                            const { done, value } = await reader.read();
                    
                            if (done) {
                                break;
                            }
                    
                            const chunk = new TextDecoder('utf-8').decode(value);
                            const regex = /data:\s*(\{.*\})/g;
                            let match;
                    
                            while ((match = regex.exec(chunk)) !== null) {
                                try {
                                    const data = JSON.parse(match[1]);
                                    if (data.choices && data.choices.length > 0) {
                                        const content = data.choices[0].delta.content;
                                        if (content !== undefined) {
                                            message += content;
                    
                                            if (messageContainerEl) {
                                                const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                                                let lastBotMessage = botMessages[botMessages.length - 1];

                                                let messageBlock = lastBotMessage.querySelector('.messageBlock');
                    
                                                if (messageBlock) {
                                                    messageBlock.innerHTML = marked(message);
                                                
                                                    addParagraphBreaks(messageBlock);
                                                    prismHighlighting(messageBlock);
                                                    codeBlockCopyButton(messageBlock);
                                                }
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error parsing JSON:', error);
                                }
                            }
                        }
                    }

                    addMessage(message, 'botMessage');
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
        const dotElement = document.querySelector('.dot');
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
async function addMessage(input: string, messageType: 'userMessage' | 'botMessage') {
    let messageObj: { userMessage?: string; botMessage?: string } = {};

    if (messageType === 'userMessage') {
        messageObj.userMessage = input;
    } else if (messageType === 'botMessage') {
        messageObj.botMessage = input;
    }

    messageHistory.push(messageObj);

    messageHistoryContent = messageHistory.map(item => {
        let content = [];
        if (item.userMessage) {
            content.push(item.userMessage);
        }
        if (item.botMessage) {
            content.push(item.botMessage);
        }
        return content.join("\n");
    }).join("\n");

    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await this.app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error("Error writing to message history file:", error);
    }
}

// Fetch response from OpenAI API
async function fetchChatCompletion(url: string, settings: { apiKey: any; model: any; system_role: any; }, messageHistoryContent: any, maxTokens: string, temperature: number) {
    const response = await fetch(
        url + '/v1/chat/completions', 
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [
                { role: 'system', content: settings.system_role },
                { role: 'user', content: messageHistoryContent }
            ],
            max_tokens: parseInt(maxTokens),
            temperature: temperature,
            stream: true,
        }),
    });

    return response;
}

// Request response from self-hosted models
async function requestUrlChatCompletion(url: any, settings: { apiKey: any; model: any; system_role: any; }, messageHistoryContent: any, maxTokens: string, temperature: number) {
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
                    { role: 'system', content: settings.system_role },
                    { role: 'user', content: messageHistoryContent }
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