import { ItemView, WorkspaceLeaf, Notice, setIcon, requestUrl } from "obsidian";
import { marked } from "marked";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import { loadPrism } from "obsidian";

export const VIEW_TYPE_CHATBOT = "chatbot-view";

let messageHistory = "";

export function setMessageHistory(newMessageHistory: string) {
    messageHistory = newMessageHistory;
}

export class BMOView extends ItemView {
    private messageEl: HTMLElement;
    private settings: BMOSettings;
    private textareaElement: HTMLTextAreaElement;
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

        const container = this.containerEl.children[1];
        container.empty();
        const chatbotContainer = container.createEl("div", {
            attr: {
                class: "chatbotContainer",
            }
        });

        chatbotContainer.createEl("h1", { 
            text: this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName,
            attr: {
            id: "chatbotNameHeading"
            }
        });

        chatbotContainer.createEl("p", {
            text: "Model: " + this.settings.model.replace(/[gpt]/g, letter => letter.toUpperCase()) || DEFAULT_SETTINGS.model.replace(/[gpt]/g, letter => letter.toUpperCase()),
            attr: {
                id: "modelName"
            }
        });
        
        chatbotContainer.createEl("div", {
            attr: {
                id: "messageContainer",
            }
        });

        const chatbox = chatbotContainer.createEl("div", {
            attr: {
                id: "chatbox",
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
    
    // Event handler methods
    handleKeyup(event: KeyboardEvent) {
        if (this.preventEnter === false && !event.shiftKey && event.key === "Enter") {
            event.preventDefault(); // prevent submission
            const input = this.textareaElement.value.trim();
            if (input.length === 0) { // check if input is empty or just whitespace
                return;
            }

            messageHistory += input + "\n";
            // console.log(messageHistory);

            // Create a new paragraph element for each message
            const userMessage = document.createElement("div");
            userMessage.classList.add("userMessage");
            
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = "USER";
            userNameSpan.setAttribute("id", "userName");
            userMessage.appendChild(userNameSpan);
            
            const userParagraph = document.createElement("p");
            const markdownContent = marked(input);
            userParagraph.innerHTML = markdownContent;
            
            const sanitizedInput = input.split("\n").map(line => {
                const sanitizedLine = document.createTextNode(line).textContent;
                return sanitizedLine ? sanitizedLine + "\n" : "\n";
            }).join('');
            
            userParagraph.innerText = sanitizedInput;
            
            userMessage.appendChild(userParagraph);

            // Append the new message to the message container
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                messageContainer.appendChild(userMessage);
            
                const botMessage = document.createElement("div");
                botMessage.classList.add("botMessage"); 
                messageContainer.appendChild(botMessage);
            
                const botNameSpan = document.createElement("span"); 
                botNameSpan.textContent = this.settings.chatbotName || DEFAULT_SETTINGS.chatbotName;
                botNameSpan.setAttribute("id", "chatbotName")
                botMessage.appendChild(botNameSpan); 

                // Create a spacer element for scrolling most recent userMessage/botMessage to
                const spacer = document.createElement("div");
                spacer.style.height = "60vh";
                spacer.setAttribute("id", "spacer");
                messageContainer.appendChild(spacer);

                userMessage.scrollIntoView({ behavior: "smooth", block: "start" });
            
                this.preventEnter = true; // Allow user to respond after the bot responded.

                // Call the chatbot function with the user's input
                this.BMOchatbot(input)
                    .then(() => {
                        this.preventEnter = false; // Allow user to respond after the bot responded.

                        // Select the spacer and remove it
                        const spacer = messageContainer.querySelector("#spacer");
                        if (spacer) {
                            spacer.remove();
                        }
                    })
                    .catch(() => {
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
    }

    async BMOchatbot(input: string) {
        // If apiKey does not exist.
        if (!this.settings.apiKey) {
            const chatbotNameHeading = document.querySelector('#chatbotNameHeading');
            const messageContainer = document.querySelector('#messageContainer');
            const chatbox = document.querySelector('#chatbox textarea') as HTMLTextAreaElement;
            new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
            if (chatbotNameHeading){
                chatbotNameHeading.textContent = "ERROR";
            }

            const lastDiv = messageContainer?.lastElementChild as HTMLDivElement;
            const errorMessage = document.createElement('p');
            errorMessage.textContent = "API key not found. Please add your OpenAI API key in the plugin settings.";
            errorMessage.classList.add('errorMessage');
            const chatbotNameError = lastDiv.querySelector('#chatbotName') as HTMLDivElement;
            chatbotNameError.textContent = "ERROR";
            lastDiv.appendChild(errorMessage);
            chatbox.disabled = true;
            return;
        }
        
        try {
            const maxTokens = this.settings.max_tokens;
            const temperature = this.settings.temperature;
        
            const controller = new AbortController();
            const signal = controller.signal;
        
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: [
                        { role: 'system', content: this.settings.system_role },
                        { role: 'user', content: messageHistory }
                    ],
                    max_tokens: parseInt(maxTokens),
                    temperature: parseFloat(temperature),
                    stream: true,
                }),
                signal: signal
            });
        
            const reader = response.body ? response.body.getReader() : null;
            
            let message = '';
            
            if (reader) {
                let messageBlock: HTMLParagraphElement | null = null;
            
                while (true) {
                    const { done, value } = await reader.read();
            
                    if (done) {
                        console.log('[DONE]');
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
                                    // console.log(content);
            
                                    const messageContainerEl = document.getElementById("messageContainer");
                                    if (messageContainerEl) {
                                        const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                                        const lastBotMessage = botMessages[botMessages.length - 1];
            
                                        // If messageBlock exists, update its content. Otherwise, create a new one.
                                        if (messageBlock) {
                                            const markdownContent = marked(message);
                                            messageBlock.innerHTML = markdownContent;
                                        } else {
                                            messageBlock = document.createElement("p");
                                            messageBlock.textContent = message;
                                            const markdownContent = marked(message);
                                            messageBlock.innerHTML = markdownContent;
                                            messageBlock.classList.add("messageBlock");
            
                                            lastBotMessage.appendChild(messageBlock);
                                        }

                                        const paragraphs = messageBlock.querySelectorAll("p");

                                        for (let i = 0; i < paragraphs.length; i++) {
                                            const p = paragraphs[i];
                                        
                                            // Check if the current <p> element has a sibling <p> element
                                            const nextSibling = p.nextElementSibling;
                                            if (nextSibling && nextSibling.nodeName === "P") {
                                        
                                            // Create a <br> element and insert it after the current <p> element
                                            const br = document.createElement("br");
                                            const parent = p.parentNode;
                                            if (parent) {
                                                parent.insertBefore(br, nextSibling);
                                            }
                                            }
                                        }

                                        // Wait for Prism.js to load
                                        loadPrism().then((Prism) => {
                                            // Select all code blocks
                                            const codeBlocks = messageBlock?.querySelectorAll('.messageBlock pre code');

                                            // Apply syntax highlighting to each code block
                                            codeBlocks?.forEach((codeBlock) => {
                                                const language = codeBlock.className.replace("language-", "");
                                                const code = codeBlock.textContent;
                                                
                                                if (language && Prism.languages[language]) {
                                                    const highlightedCode = Prism.highlight(code, Prism.languages[language]);
                                                    codeBlock.innerHTML = highlightedCode;
                                                }
                                            });
                                        });


                                        // Copy button for code blocks
                                        const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');

                                        codeBlocks.forEach(async (codeElement) => {
                                        //   console.log(codeElement);
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
                                }
                            }
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                        }
                    }
                }
            }

            messageHistory += message + "\n";
        } 
        catch (error) {
            new Notice('Error occurred while fetching completion: ' + error.message);
            console.log(error.message);
            // console.log("messageHistory: " + messageHistory);
        }
        console.log("BMO settings:", this.settings);
    }

    async onClose() {
        // Nothing to clean up.
    }

}
