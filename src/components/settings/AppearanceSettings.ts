import { ColorComponent, Setting, SettingTab } from "obsidian";
import BMOGPT, { DEFAULT_SETTINGS } from "src/main";
import { colorToHex } from "src/utils/ColorConverter";

export function addAppearanceSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    containerEl.createEl('h2', {text: 'Appearance'});
    
    new Setting(containerEl)
        .setName('User Name')
        .setDesc('Create a username.')
        .addText(text => text
            .setPlaceholder('Enter user name')
            .setValue(plugin.settings.userName || DEFAULT_SETTINGS.userName)
            .onChange(async (value) => {
                plugin.settings.userName = value ? value.toUpperCase() : DEFAULT_SETTINGS.userName;
                text.inputEl.maxLength = 30;
                await plugin.saveSettings();
                const userNames = document.querySelectorAll('.userName') as NodeListOf<HTMLHeadingElement>;
                userNames.forEach(userName => {
                    userName.textContent = plugin.settings.userName;
                });
            })
        );

    new Setting(containerEl)
        .setName('Chatbot Name')
        .setDesc('Name your chatbot.')
        .addText(text => text
            .setPlaceholder('Enter chatbot name')
            .setValue(plugin.settings.chatbotName || DEFAULT_SETTINGS.chatbotName)
            .onChange(async (value) => {
                plugin.settings.chatbotName = value ? value.toUpperCase() : DEFAULT_SETTINGS.chatbotName;
                text.inputEl.maxLength = 30;
                await plugin.saveSettings();
                const chatbotNameHeading = document.querySelector('#chatbotNameHeading') as HTMLHeadingElement;
                const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
                if (chatbotNameHeading) {
                    chatbotNameHeading.textContent = plugin.settings.chatbotName;
                }
                chatbotNames.forEach(chatbotName => {
                    chatbotName.textContent = plugin.settings.chatbotName;
                });
            })
        );

    let colorPicker1: ColorComponent;
    const defaultUserMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.userMessageBackgroundColor).trim();
    
    new Setting(containerEl)
        .setName('Background color for User Messages')
        .setDesc('Modify the background color of the userMessage element.')
        .addButton(button => button
            .setButtonText("Restore Default")
            .setIcon("rotate-cw")
            .setClass("clickable-icon")
            .onClick(async () => {
                const defaultValue = colorToHex(defaultUserMessageBackgroundColor);
                colorPicker1.setValue(defaultValue);
    
                const messageContainer = document.querySelector('#messageContainer');
                if (messageContainer) {
                    const userMessages = messageContainer.querySelectorAll('.userMessage');
                    userMessages.forEach((userMessage) => {
                        const element = userMessage as HTMLElement;
                        element.style.backgroundColor = defaultValue;
                    });
                    await plugin.saveSettings();
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker1 = color;

            let defaultValue = plugin.settings.userMessageBackgroundColor;

            if (plugin.settings.userMessageBackgroundColor == "--background-primary") {
                defaultValue = colorToHex(defaultUserMessageBackgroundColor);
            }

            color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.userMessageBackgroundColor = hexValue;
                const messageContainer = document.querySelector('#messageContainer');
                if (messageContainer) {
                    const userMessages = messageContainer.querySelectorAll('.userMessage');
                    userMessages.forEach((userMessage) => {
                        const element = userMessage as HTMLElement;
                        element.style.backgroundColor = hexValue;
                    });
                }

                await plugin.saveSettings();
            });
        });

    let colorPicker2: ColorComponent;
    const defaultBotMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.botMessageBackgroundColor).trim();

    new Setting(containerEl)
        .setName('Background color for Bot Messages')
        .setDesc('Modify the background color of the botMessage element.')
        .addButton(button => button
            .setButtonText("Restore Default")
            .setIcon("rotate-cw")
            .setClass("clickable-icon")
            .onClick(async () => {
                const defaultValue = colorToHex(defaultBotMessageBackgroundColor);
                colorPicker2.setValue(defaultValue);
    
                const messageContainer = document.querySelector('#messageContainer');
                if (messageContainer) {
                    const botMessages = messageContainer.querySelectorAll('.botMessage');
                    botMessages.forEach((botMessage) => {
                        const element = botMessage as HTMLElement;
                        element.style.backgroundColor = defaultValue;
                    });
                    await plugin.saveSettings();
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker2 = color;

            let defaultValue = plugin.settings.botMessageBackgroundColor;

            if (plugin.settings.botMessageBackgroundColor == "--background-secondary") {
                defaultValue = colorToHex(defaultBotMessageBackgroundColor);
            }

            color.setValue(defaultValue)
                .onChange(async (value) => {
                    const hexValue = colorToHex(value);
                    plugin.settings.botMessageBackgroundColor = hexValue;
                    const messageContainer = document.querySelector('#messageContainer');
                    if (messageContainer) {
                        const botMessages = messageContainer.querySelectorAll('.botMessage');
                        botMessages.forEach((botMessage) => {
                            const element = botMessage as HTMLElement;
                            element.style.backgroundColor = hexValue;
                        });
                    }
            await plugin.saveSettings();
        });
    });

    new Setting(containerEl)
    .setName('Allow Header')
    .setDesc('Display chatbot name and model name in header.')
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.allowHeader).onChange((value) => {
            plugin.settings.allowHeader = value;
            const referenceCurrentNoteElement = document.querySelector('#referenceCurrentNote') as HTMLElement;

            if (value === true) {
                const header = document.querySelector('#header') as HTMLElement;

                if (header) {
                    header.style.display = 'block';
                    referenceCurrentNoteElement.style.margin = `-0.5rem 0 0.5rem 0`;
                }
            } else {
                const header = document.querySelector('#header') as HTMLElement;
                const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
                if (header) {
                    header.style.display = 'none';
                    messageContainer.style.maxHeight = `calc(100% - 60px)`;
                    referenceCurrentNoteElement.style.margin = `0.5rem 0 0.5rem 0`;
                }
            }
            plugin.saveSettings();
        })
    );
}