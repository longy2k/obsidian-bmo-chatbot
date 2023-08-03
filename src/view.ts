import { ItemView, WorkspaceLeaf, Notice, setIcon, requestUrl } from "obsidian";
import {DEFAULT_SETTINGS, BMOSettings} from './main';
import { marked } from "marked";
import { loadPrism } from "obsidian";

export const VIEW_TYPE_CHATBOT = "chatbot-view";

let messageHistory: string;
let savedMessageHistoryHTML: string;


export let filenameMessageHistory = './.obsidian/plugins/bmo-chatbot/data/messageHistory.txt';
export let filenameMessageHistoryHTML = './.obsidian/plugins/bmo-chatbot/data/messageHistory.html';
export let filenameMessageHistoryJSON = './.obsidian/plugins/bmo-chatbot/data/messageHistory.json';

interface Message {
    [key: string]: string;
}

function HTMLToJSON(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const messageDivs = doc.querySelectorAll("div");
    const messages: Message[] = [];

    messageDivs.forEach((div) => {
        const className = div.getAttribute("class");
        const paragraphs = div.querySelectorAll("p");
        let content = "";
        paragraphs.forEach((paragraph) => {
            content += paragraph.textContent?.trim() + " ";
        });

        if (className && content.trim()) {
            const message: Message = { [className]: content.trim() };
            messages.push(message);
        }
    });

    return JSON.stringify(messages);
}

export function colorToHex(colorValue: string): string {
    if (colorValue.startsWith("hsl")) {
      // Convert HSL to HEX
      let match = colorValue.match(/(\d+(\.\d+)?)%?/g);
      if (match === null || match.length < 3) {
		throw new Error("Invalid HSL value");
	  }
      let h = parseInt(match[0]) / 360;
      let s = parseInt(match[1]) / 100;
      let l = parseInt(match[2]) / 100;
  
      function hue2rgb(p: number, q: number, t: number) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
  
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      let r = hue2rgb(p, q, h + 1 / 3);
      let g = hue2rgb(p, q, h);
      let b = hue2rgb(p, q, h - 1 / 3);
  
      let toHex = function (c: number) {
        let hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
  
      let hex = "#" + toHex(r) + toHex(g) + toHex(b);
      return hex;
    } else if (colorValue.startsWith("rgb")) {
      // Convert RGB to HEX
      let sep = colorValue.indexOf(",") > -1 ? "," : " ";
      let rgbArray = colorValue.substr(4).split(")")[0].split(sep);
  
      let r = (+rgbArray[0]).toString(16),
        g = (+rgbArray[1]).toString(16),
        b = (+rgbArray[2]).toString(16);
  
      if (r.length == 1)
        r = "0" + r;
      if (g.length == 1)
        g = "0" + g;
      if (b.length == 1)
        b = "0" + b;
  
      return "#" + r + g + b;
    } else {
      // If the colorValue is neither RGB nor HSL, return the input
      return colorValue;
    }
  }


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
        const container = this.containerEl.children[1];
        container.empty();
        const chatbotContainer = container.createEl("div", {
            attr: {
                class: "chatbotContainer",
            },
        });
        
        chatbotContainer.style.backgroundColor = colorToHex(this.settings.chatbotContainerBackgroundColor) || colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.chatbotContainerBackgroundColor).trim());
        
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
        
        const messageContainer = chatbotContainer.createEl("div", {
            attr: {
            id: "messageContainer",
            },
        });

        if (await this.app.vault.adapter.exists(filenameMessageHistoryHTML)) {
            messageContainer.innerHTML = await this.app.vault.adapter.read(filenameMessageHistoryHTML);
            messageContainer.scrollTop = messageContainer.scrollHeight;
            // Copy button for code blocks
            const codeBlocks = messageContainer.querySelectorAll('.botMessage .messageBlock pre');

            codeBlocks.forEach(async (codeElement) => {
                codeElement.addEventListener("click", () => {
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
    async handleKeyup(event: KeyboardEvent) {
        // Create /data/ folder if does not exist.
        if (!await this.app.vault.adapter.exists('./.obsidian/plugins/bmo-chatbot/data/')) {
            this.app.vault.adapter.mkdir('./.obsidian/plugins/bmo-chatbot/data/');
        }


        if (this.preventEnter === false && !event.shiftKey && event.key === "Enter") {
            event.preventDefault(); // prevent submission
            const input = this.textareaElement.value.trim();
            if (input.length === 0) { // check if input is empty or just whitespace
                return;
            }
            if (await this.app.vault.adapter.exists(filenameMessageHistory)) {
                messageHistory = await this.app.vault.adapter.read(filenameMessageHistory);
            }
            messageHistory += input + "\n";

            // Create a new paragraph element for each message
            const userMessage = document.createElement("div");
            userMessage.classList.add("userMessage");
            userMessage.style.backgroundColor = colorToHex(this.settings.userMessageBackgroundColor) || colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim());
            
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = this.settings.userName || DEFAULT_SETTINGS.userName;
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
                botMessage.style.backgroundColor = colorToHex(this.settings.botMessageBackgroundColor) || colorToHex(getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim());
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
                    // Access the loadingEl element with optional chaining
                    const loadingEl = document.querySelector('#loading');
                    // If loadingEl is null or undefined, return early
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

                // Call the updateLoadingAnimation function every 500 milliseconds
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

        const messageContainerEl = document.getElementById("messageContainer");

        if (this.settings.model !== "gpt-3.5-turbo" && this.settings.model !== "gpt-3.5-turbo-16k" && this.settings.model !== "gpt-4") {
            const completionUrl = this.settings.restAPIUrl + '/v1/chat/completions';

            try {
                const maxTokens = this.settings.max_tokens;
                const temperature = this.settings.temperature;
                
                const response = await requestUrl({
                    url: completionUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.settings.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.settings.model,
                        messages: [
                            { role: 'system', content: this.settings.system_role},
                            { role: 'user', content: messageHistory }
                        ],
                        max_tokens: parseInt(maxTokens),
                        temperature: parseFloat(temperature),
                    }),
                });
                
                console.log(response.json);
            
                const message = response.json.choices[0].message.content;

                if (messageHistory.length === 0) {
                    await this.app.vault.adapter.append(filenameMessageHistory, messageHistory);
                }
                else {
                    messageHistory += message + "\n";
                    await this.app.vault.adapter.write(filenameMessageHistory, messageHistory);
                }

                if (messageContainerEl) {
                    savedMessageHistoryHTML = messageContainerEl.innerHTML;
                    savedMessageHistoryHTML = savedMessageHistoryHTML.replace(/<div id="spacer">.*?<\/div>/gi, '');
                    this.saveMessageHistoryToFile(savedMessageHistoryHTML);
                }
    
                if (messageContainerEl) {
                    const botMessages = messageContainerEl.querySelectorAll(".botMessage");
                    const lastBotMessage = botMessages[botMessages.length - 1];
                    const loadingEl = lastBotMessage.querySelector("#loading");
                    
                    if (loadingEl) {
                        loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        lastBotMessage.removeChild(loadingEl); // Remove loading message
                    }
                
                    const messageBlock = document.createElement("p");
                    messageBlock.textContent = message;
                    const markdownContent = marked(message);
                    messageBlock.innerHTML = markdownContent;
                    messageBlock.classList.add("messageBlock");
                    
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
                        const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');
                        
                        // Apply syntax highlighting to each code block
                        codeBlocks.forEach((codeBlock) => {
                        const language = codeBlock.className.replace("language-", "");
                        const code = codeBlock.textContent;
                        const highlightedCode = Prism.highlight(code, Prism.languages[language]);
                        codeBlock.innerHTML = highlightedCode;
                        });
                    });
    
                    // Copy button for code blocks
                    const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');
    
                    codeBlocks.forEach(async (codeElement) => {
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
                    
                    lastBotMessage.appendChild(messageBlock);
                    lastBotMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (messageContainerEl) {
                    savedMessageHistoryHTML = messageContainerEl.innerHTML;
                    savedMessageHistoryHTML = savedMessageHistoryHTML.replace(/<div id="spacer">.*?<\/div>/gi, '');
                    this.saveMessageHistoryToFile(savedMessageHistoryHTML);
                }
            } 
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
                console.log("messageHistory: " + messageHistory);
            }
        }
        else {
        
            try {
                const maxTokens = this.settings.max_tokens;
                const temperature = this.settings.temperature;
            
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
                });
            
                const reader = response.body ? response.body.getReader() : null;
                
                let message = '';
                
                if (reader) {
                
                    while (true) {
                        const { done, value } = await reader.read();
                
                        if (done) {
                            // console.log('[DONE]');
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
                                }
                            } catch (error) {
                                console.error('Error parsing JSON:', error);
                            }
                        }
                    }
                }

                if (messageHistory.length === 0) {
                    await this.app.vault.adapter.append(filenameMessageHistory, messageHistory);
                }
                else {
                    messageHistory += message + "\n";
                    await this.app.vault.adapter.write(filenameMessageHistory, messageHistory);
                }
            } 
            catch (error) {
                new Notice('Error occurred while fetching completion: ' + error.message);
                console.log(error.message);
                console.log("messageHistory: " + messageHistory);
            }
        }
        console.log("BMO settings:", this.settings);

        if (messageContainerEl) {
            savedMessageHistoryHTML = messageContainerEl.innerHTML;
            savedMessageHistoryHTML = savedMessageHistoryHTML.replace(/<div id="spacer">.*?<\/div>/gi, '');
            this.saveMessageHistoryToFile(savedMessageHistoryHTML);
        }
        let htmlFile = await this.app.vault.adapter.read(filenameMessageHistoryHTML);
        await this.app.vault.adapter.write(filenameMessageHistoryJSON, HTMLToJSON(htmlFile));
    }

    async saveMessageHistoryToFile(messageHistory: string) {
        try {
          await this.app.vault.adapter.write(filenameMessageHistoryHTML, messageHistory);
        } catch (error) {
          console.error('Error saving message history:', error);
        }
      }    

    async onClose() {
        // Nothing to clean up.
    }

}
