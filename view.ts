import { ItemView, WorkspaceLeaf, Notice, View } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

let messageHistory = "";

export function setMessageHistory(newMessageHistory: string) {
    messageHistory = newMessageHistory;
}

interface BMOSettings {
	apiKey: string;
	max_tokens: number;
	system_role: string;
	temperature: number;
    botName: string;
}

const DEFAULT_SETTINGS: BMOSettings = {
	apiKey: '',
	max_tokens: 4096,
	system_role: 'You are a helpful assistant.',
	temperature: 1,
	botName: "BOT",
}

export class BMOView extends ItemView {
    private messageEl: HTMLElement;
    private settings: BMOSettings;

    constructor(leaf: WorkspaceLeaf, settings: BMOSettings) {
        super(leaf);
        this.settings = settings;
        this.icon = 'bot';
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return "Chatbot";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        const bmoContainer = container.createEl("div", {
            attr: {
            id: "bmoContainer",
            }
        });

    bmoContainer.createEl("h1", { 
        text: this.settings.botName || DEFAULT_SETTINGS.botName,
        attr: {
          id: "bmoHeading"
        }
    });

    bmoContainer.createEl("p", {
        text: "Model: GPT-3.5-Turbo",
        attr: {
            id: "modelName"
          }
    });

    bmoContainer.createEl("div", {
        attr: {
            id: "messageContainer",
        }
    });
    
    const chatbox = bmoContainer.createEl("textarea", {
        attr: {
            id: "chatbox",
            placeholder: "Start typing...",
        }
    });

    const loadingEl = bmoContainer.createEl("div", {
        attr: {
            id: "loading",
        },
        text: "..."
    });
    
    const chatboxElement = chatbox as HTMLTextAreaElement;
    
    chatboxElement.addEventListener("keyup", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // prevent submission
            const input = chatboxElement.value.trim();
            if (input.length === 0) { // check if input is empty or just whitespace
                return;
            }

            messageHistory += input + "\n";
            this.BMOchatbot(input);
            console.log(messageHistory);

            // Create a new paragraph element for each message
            const userMessage = document.createElement("div");
            userMessage.classList.add("userMessage");
            userMessage.style.display = "inline-block";
            
            const userNameSpan = document.createElement("span"); 
            userNameSpan.innerText = "USER"; 
            userNameSpan.setAttribute("id", "userName"); 
            userMessage.appendChild(userNameSpan);
            
            const userParagraph = document.createElement("p");
            userParagraph.innerHTML = input.replace(/\n/g, "<br>"); //save the newlines
            
            userMessage.appendChild(userParagraph);

            // Append the new message to the message container
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                messageContainer.appendChild(userMessage);
            
                const botMessage = document.createElement("div"); // create div element
                botMessage.classList.add("botMessage"); // add class "botMessage" to the div element
                botMessage.style.display = "inline-block"; // set display style to "inline-block"
                messageContainer.appendChild(botMessage); // add botMessage to messageContainer
            
                const botNameSpan = document.createElement("span"); // create span element
                botNameSpan.innerText = this.settings.botName || DEFAULT_SETTINGS.botName;
                botNameSpan.setAttribute("id", "botName"); // set the id of the span element
                botNameSpan.style.display = "block"; // set display style to "inline-block"
                botMessage.appendChild(botNameSpan); // add botNameSpan to botMessage
            
                const loadingEl = document.createElement("span"); // create span element
                loadingEl.setAttribute("id", "loading"); // set the id of the span element
                loadingEl.style.display = "inline-block"; // set display style to "inline-block"
                loadingEl.textContent = "..."; // set the text of the span element to "..."
                botMessage.appendChild(loadingEl); // add loadingEl to botMessage
            }
            

            messageContainer.scrollTo(0, document.body.scrollHeight);
    
            chatboxElement.value = "";
            setTimeout(() => {
                chatboxElement.style.height = "36px";
                chatboxElement.value = chatboxElement.value.replace(/^[\r\n]+|[\r\n]+$/gm,""); // remove newlines only at beginning or end of input
                chatboxElement.setSelectionRange(0, 0);
            }, 0);
        }
    });

    chatboxElement.addEventListener("input", (event) => {
        chatboxElement.style.height = "36px";
        chatboxElement.style.height = `${chatboxElement.scrollHeight}px`;
      });
  }

  async BMOchatbot(input: string) {
    if (!this.settings.apiKey) {
    	new Notice("API key not found. Please add your OpenAI API key in the plugin settings.");
    	return;
    }

    console.log("BMO settings:", this.settings);
    // console.log("system_role:", this.settings.system_role);
    

    try {
    	const maxTokens = parseInt(this.settings.max_tokens);
    	const temperature = parseInt(this.settings.temperature);

    	const response = await fetch('https://api.openai.com/v1/chat/completions', {
    		method: 'POST',
    		headers: {
    			'Content-Type': 'application/json',
    			'Authorization': `Bearer ${this.settings.apiKey}`
    		},
    		body: JSON.stringify({
    			model: 'gpt-3.5-turbo',
    			messages: [
    				{ role: 'system', content: this.settings.system_role },
    				{ role: 'user', content: messageHistory }
    			],
    			max_tokens: maxTokens,
    			temperature: temperature,
    		}),
    	});

        const data = await response.json();
        // console.log(data);

        const message = data.choices[0].message.content;
        messageHistory += message + "\n";


        // Append the bmoMessage element to the messageContainer div
        const messageContainerEl = document.getElementById("messageContainer");

        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const loadingEl = lastBotMessage.querySelector("#loading");
            
            // if (loadingEl) {
            //   lastBotMessage.removeChild(loadingEl); // Remove loading message
            // }
          
            // const messageParagraph = document.createElement("p");
            // messageParagraph.textContent = message;
            
            // lastBotMessage.appendChild(messageParagraph);
          }
        
    
        } catch (error) {
        	new Notice('Error occurred while fetching completion: ' + error.message);
        }
}

  async onClose() {
    // Nothing to clean up.
  }

}
