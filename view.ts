import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class BMOView extends ItemView {
    private messageEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return "BMO";
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
        text: "BMO",
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
            id: "messageContainer"
        }
    });
    
    const chatbox = bmoContainer.createEl("textarea", {
        attr: {
            id: "chatbox",
            placeholder: "Start typing...",
        }
    });
    
    const chatboxElement = chatbox as HTMLTextAreaElement;
    
    chatboxElement.addEventListener("keyup", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault(); // prevent submission
            const input = chatboxElement.value.trim();
            if (input.length === 0) { // check if input is empty or just whitespace
                return;
            }

            // Create a new paragraph element for each message
            const userMessage = document.createElement("p");
            userMessage.innerHTML = input.replace(/\n/g, "<br>"); //save the newlines
            userMessage.style.display = "inline-block";

            const inputReceivedEvent = new CustomEvent("inputReceived", { detail: { value: input } });
            window.dispatchEvent(inputReceivedEvent);
            console.log("SENT");
            
            // Append the new message to the message container
            const messageContainer = document.querySelector("#messageContainer");
            if (messageContainer) {
                messageContainer.appendChild(userMessage);
            }
    
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

  async onClose() {
    // Nothing to clean up.
  }

//   getInputValue(): string {
//     const chatboxElement = this.containerEl.querySelector("#chatbox") as HTMLTextAreaElement;
//     return chatboxElement.value;
//   }

//   setMessageText(text: string) {
//     this.messageEl.setText(text);
//     console.log("Message:" + text);
//   }
}
