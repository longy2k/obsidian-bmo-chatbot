import { ItemView, WorkspaceLeaf, Notice, setIcon, requestUrl, loadPrism, TFile } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import { colorToHex } from "./settings";
import { marked } from "marked";
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from "openai/resources/chat";

export const VIEW_TYPE_CHATBOT = "chatbot-view";
export const filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';
export let messageHistory: { role: string; content: string }[] = [];


export function clearMessageHistory() {
    messageHistory = [];
}

let messageHistoryContent: { role: string; content: string }[] = [];

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
        
        messageHistory.forEach(messageData => {
            if (messageData.role == "user") {
                const userMessageDiv = document.createElement("div");
                userMessageDiv.className = "userMessage";
                userMessageDiv.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor || getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
        
                const userNameSpan = document.createElement("span");
                userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
                userNameSpan.setAttribute("id", "userName");
                userMessageDiv.appendChild(userNameSpan);
                userMessageDiv.appendChild(userNameSpan);
        
                const userP = document.createElement("p");

                if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                    const fullString = messageData.content;
                    const cleanString = fullString.split(' ').slice(1).join(' ');
                    
                    userP.innerHTML = marked(cleanString);
                } else {
                    console.log(marked(messageData.content));
                    userP.innerHTML = marked(messageData.content);
                }
                
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
        
                const botP = document.createElement("p");

                if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                    const fullString = messageData.content;
                    const cleanString = fullString.split(' ').slice(1).join(' ');
                    
                    botP.innerHTML = marked(cleanString);
                } else {
                    console.log(marked(messageData.content));
                    botP.innerHTML = marked(messageData.content);
                }

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

            if (["claude-instant-1.2", "claude-2.0"].includes(this.settings.model)) {
                addMessage('\n\nHuman: ' + input, 'userMessage');
            } else {
                addMessage(input, 'userMessage');
            }
            
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

                if (!["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(this.settings.model)) {
                    botMessage.appendChild(loadingEl);
                    loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }

                const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);

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

            // OpenAI models
            if (["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"].includes(this.settings.model)) {
                try {
                    fetchOpenAIAPI(settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature); 
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
                    const response = await requestUrlAnthropicAPI(url, settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature);

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

                    addMessage('\n\nAssistant: ' + completionText, 'botMessage');
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
            else {
                try { 
                    const response = await requestUrlChatCompletion(this.settings.restAPIUrl, settings, referenceCurrentNote, messageHistoryContent, maxTokens, temperature);
                
                    const message = response.json.choices[0].message.content;

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
        }
        // console.log("BMO settings:", this.settings);
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
async function addMessage(input: string, messageType: 'userMessage' | 'botMessage') {
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
    settings: { apiKey: string; model: string; system_role: string;},
    referenceCurrentNote: string,
    messageHistoryContent: { role: string; content: string }[] = [],
    maxTokens: string,
    temperature: number) 
    {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
        dangerouslyAllowBrowser: true, // apiKey is stored within data.json
    });

    const messageHistory = messageHistoryContent.map(item => ({
        role: item.role,
        content: item.content,
    })) as ChatCompletionMessageParam[];

    // console.log(referenceCurrentNote + settings.system_role);

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

        addMessage(message, 'botMessage');
    } catch (error) {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];

            const messageBlock = lastBotMessage.querySelector('.messageBlock');

            if (messageBlock) {
                messageBlock.innerHTML = marked(error.response?.data?.error || error.message);
                addMessage(messageBlock.innerHTML, 'botMessage');
            }
        }
        throw new Error(error.response?.data?.error || error.message);
    }
}

// Request response from Anthropic 
async function requestUrlAnthropicAPI(
    url: string,
    settings: { apiKey: string; model: string; system_role: string; },
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

    // console.log(requestBody.prompt);
  
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
                addMessage(messageBlock.innerHTML, 'botMessage');

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

