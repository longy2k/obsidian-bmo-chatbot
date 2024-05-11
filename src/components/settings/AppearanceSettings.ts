import { ColorComponent, Setting, SettingTab, setIcon } from 'obsidian';
import BMOGPT, { DEFAULT_SETTINGS } from 'src/main';
import { colorToHex } from 'src/utils/ColorConverter';

export function addAppearanceSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', {text: 'Appearance'});

    const initialState = plugin.settings.toggleAppearanceSettings;
    const chevronIcon = toggleSettingContainer.createEl('span', { cls: 'chevron-icon' });
    setIcon(chevronIcon, initialState ? 'chevron-down' : 'chevron-right');

    // Create the settings container to be toggled
    const settingsContainer = containerEl.createDiv({ cls: 'settingsContainer' });
    settingsContainer.style.display = initialState ? 'block' : 'none';

    // Toggle visibility
    toggleSettingContainer.addEventListener('click', async () => {
        const isOpen = settingsContainer.style.display !== 'none';
        if (isOpen) {
            setIcon(chevronIcon, 'chevron-right'); // Close state
            settingsContainer.style.display = 'none';
            plugin.settings.toggleAppearanceSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleAppearanceSettings = true;
        }
        await plugin.saveSettings();
    });

    new Setting(settingsContainer)
    .setName('Allow Header')
    .setDesc('Display chatbot name and model name in header.')
    .addToggle((toggle) =>
        toggle.setValue(plugin.settings.appearance.allowHeader).onChange((value) => {
            plugin.settings.appearance.allowHeader = value;
            const referenceCurrentNoteElement = document.querySelector('#referenceCurrentNote') as HTMLElement;

            if (value === true) {
                const header = document.querySelector('#header') as HTMLElement;

                if (header) {
                    header.style.display = 'block';
                    referenceCurrentNoteElement.style.margin = '-0.5rem 0 0.5rem 0';
                }
            } else {
                const header = document.querySelector('#header') as HTMLElement;
                const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
                if (header) {
                    header.style.display = 'none';
                    messageContainer.style.maxHeight = 'calc(100% - 60px)';
                    referenceCurrentNoteElement.style.margin = '0.5rem 0 0.5rem 0';
                }
            }
            plugin.saveSettings();
        })
    );
    
    new Setting(settingsContainer)
        .setName('User Name')
        .setDesc('Create a username.')
        .addText(text => text
            .setPlaceholder('Enter user name')
            .setValue(plugin.settings.appearance.userName || DEFAULT_SETTINGS.appearance.userName)
            .onChange(async (value) => {
                plugin.settings.appearance.userName = value ? value : DEFAULT_SETTINGS.appearance.userName;
                text.inputEl.maxLength = 30;
                await plugin.saveSettings();
                const userNames = document.querySelectorAll('.userName') as NodeListOf<HTMLHeadingElement>;
                userNames.forEach(userName => {
                    userName.textContent = plugin.settings.appearance.userName;
                });
            })
        );

    // new Setting(settingsContainer)
    //     .setName('Chatbot Name')
    //     .setDesc('Name your chatbot.')
    //     .addText(text => text
    //         .setPlaceholder('Enter chatbot name')
    //         .setValue(plugin.settings.appearance.chatbotName || DEFAULT_SETTINGS.appearance.chatbotName)
    //         .onChange(async (value) => {
    //             plugin.settings.appearance.chatbotName = value ? value.toUpperCase() : DEFAULT_SETTINGS.appearance.chatbotName;
    //             text.inputEl.maxLength = 30;
    //             await plugin.saveSettings();
    //             const chatbotNameHeading = document.querySelector('#chatbotNameHeading') as HTMLHeadingElement;
    //             const chatbotNames = document.querySelectorAll('.chatbotName') as NodeListOf<HTMLHeadingElement>;
    //             if (chatbotNameHeading) {
    //                 chatbotNameHeading.textContent = plugin.settings.appearance.chatbotName;
    //             }
    //             chatbotNames.forEach(chatbotName => {
    //                 chatbotName.textContent = plugin.settings.appearance.chatbotName;
    //             });
    //         })
    //     );

    let colorPicker1: ColorComponent;
    const defaultChatbotContainerBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatbotContainerBackgroundColor).trim();

    let colorPicker2: ColorComponent;
    const defaultMessageContainerBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.messageContainerBackgroundColor).trim();

    let colorPicker3: ColorComponent;
    const defaultUserMessageFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageFontColor).trim();

    let colorPicker4: ColorComponent;
    const defaultUserMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim();

    let colorPicker5: ColorComponent;
    const defaultBotMessageFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageFontColor).trim();

    let colorPicker6: ColorComponent;
    const defaultBotMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim();

    let colorPicker7: ColorComponent;
    const defaultChatBoxFontColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxFontColor).trim();

    let colorPicker8: ColorComponent;
    const defaultChatBoxBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor).trim();

    new Setting(settingsContainer)
        .setName('Chatbot Container Background Color')
        .setDesc('Modify the background color of the chatbot container.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultChatbotContainerBackgroundColor);
                colorPicker1.setValue(defaultValue);

                const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
                const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
                if (chatbotContainer) {
                    // Modify the background color of the chatbot container
                    chatbotContainer.style.backgroundColor = defaultValue;
                    messageContainer.style.backgroundColor = colorPicker2.getValue();
                    await plugin.saveSettings();
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker1 = color;

            let defaultValue = plugin.settings.appearance.chatbotContainerBackgroundColor;

            if (plugin.settings.appearance.chatbotContainerBackgroundColor == '--background-secondary') {
                defaultValue = colorToHex(defaultChatbotContainerBackgroundColor);
            }

            color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.appearance.chatbotContainerBackgroundColor = hexValue;
                const chatbotContainer = document.querySelector('.chatbotContainer') as HTMLElement;
                const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
                if (chatbotContainer) {
                    chatbotContainer.style.backgroundColor = hexValue;
                    messageContainer.style.backgroundColor = colorPicker2.getValue();
                }
                await plugin.saveSettings();
            });
        });

    new Setting(settingsContainer)
    .setName('Message Container Background Color')
    .setDesc('Modify the background color of the message container.')
    .addButton(button => button
        .setButtonText('Restore Default')
        .setIcon('rotate-cw')
        .setClass('clickable-icon')
        .onClick(async () => {
            const defaultValue = colorToHex(defaultMessageContainerBackgroundColor);
            colorPicker2.setValue(defaultValue);

            const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
            if (messageContainer) {
                // Modify the background color of the chatbot container
                messageContainer.style.backgroundColor = defaultValue;
                await plugin.saveSettings();
            }
        })
    )
    .addColorPicker((color) => {
        colorPicker2 = color;

        let defaultValue = plugin.settings.appearance.messageContainerBackgroundColor;

        if (plugin.settings.appearance.messageContainerBackgroundColor == '--background-secondary') {
            defaultValue = colorToHex(defaultMessageContainerBackgroundColor);
        }

        color.setValue(defaultValue)
        .onChange(async (value) => {
            const hexValue = colorToHex(value);
            plugin.settings.appearance.messageContainerBackgroundColor = hexValue;
            const messageContainer = document.querySelector('#messageContainer') as HTMLElement;
            if (messageContainer) {
                messageContainer.style.backgroundColor = hexValue;
            }
            await plugin.saveSettings();
        });
    });

    new Setting(settingsContainer)
        .setName('User Message Font Color')
        .setDesc('Modify the font color of the user message.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultUserMessageFontColor);
                colorPicker3.setValue(defaultValue);

                const messageContainer = document.querySelector('#messageContainer');
                if (messageContainer) {
                    const userMessages = messageContainer.querySelectorAll('.userMessage');
                    userMessages.forEach((userMessage) => {
                        const element = userMessage as HTMLElement;
                        element.style.color = defaultValue;
                    });
                    await plugin.saveSettings();
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker3 = color;

            let defaultValue = plugin.settings.appearance.userMessageFontColor;

            if (plugin.settings.appearance.userMessageFontColor == '--text-normal') {
                defaultValue = colorToHex(defaultUserMessageFontColor);
            }

            color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.appearance.userMessageFontColor = hexValue;
                const messageContainer = document.querySelector('#messageContainer');
                if (messageContainer) {
                    const userMessages = messageContainer.querySelectorAll('.userMessage');
                    userMessages.forEach((userMessage) => {
                        const element = userMessage as HTMLElement;
                        element.style.color = hexValue;
                    });
                }

                await plugin.saveSettings();
            });
        });

    new Setting(settingsContainer)
        .setName('User Message Background Color')
        .setDesc('Modify the background color of the user message.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultUserMessageBackgroundColor);
                colorPicker4.setValue(defaultValue);
    
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
            colorPicker4 = color;

            let defaultValue = plugin.settings.appearance.userMessageBackgroundColor;

            if (plugin.settings.appearance.userMessageBackgroundColor == '--background-primary') {
                defaultValue = colorToHex(defaultUserMessageBackgroundColor);
            }

            color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.appearance.userMessageBackgroundColor = hexValue;
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

    new Setting(settingsContainer)
    .setName('Bot Message Font Color')
    .setDesc('Modify the font color of the bot message.')
    .addButton(button => button
        .setButtonText('Restore Default')
        .setIcon('rotate-cw')
        .setClass('clickable-icon')
        .onClick(async () => {
            const defaultValue = colorToHex(defaultBotMessageFontColor);
            colorPicker5.setValue(defaultValue);

            const messageContainer = document.querySelector('#messageContainer');
            if (messageContainer) {
                const botMessages = messageContainer.querySelectorAll('.botMessage');
                botMessages.forEach((botMessage) => {
                    const element = botMessage as HTMLElement;
                    element.style.color = defaultValue;
                });
                await plugin.saveSettings();
            }
        })
    )
    .addColorPicker((color) => {
        colorPicker5 = color;

        let defaultValue = plugin.settings.appearance.botMessageFontColor;

        if (plugin.settings.appearance.botMessageFontColor == '--text-normal') {
            defaultValue = colorToHex(defaultBotMessageFontColor);
        }

        color.setValue(defaultValue)
        .onChange(async (value) => {
            const hexValue = colorToHex(value);
            plugin.settings.appearance.botMessageFontColor = hexValue;
            const messageContainer = document.querySelector('#messageContainer');
            if (messageContainer) {
                const botMessages = messageContainer.querySelectorAll('.botMessage');
                botMessages.forEach((botMessage) => {
                    const element = botMessage as HTMLElement;
                    element.style.color = hexValue;
                });
            }

            await plugin.saveSettings();
        });
    });

    new Setting(settingsContainer)
        .setName('Bot Message Background Color')
        .setDesc('Modify the background color of the bot message.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultBotMessageBackgroundColor);
                colorPicker6.setValue(defaultValue);
    
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
            colorPicker6 = color;

            let defaultValue = plugin.settings.appearance.botMessageBackgroundColor;

            if (plugin.settings.appearance.botMessageBackgroundColor == '--background-secondary') {
                defaultValue = colorToHex(defaultBotMessageBackgroundColor);
            }

            color.setValue(defaultValue)
                .onChange(async (value) => {
                    const hexValue = colorToHex(value);
                    plugin.settings.appearance.botMessageBackgroundColor = hexValue;
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

    new Setting(settingsContainer)
    .setName('Chatbox Font Color')
    .setDesc('Modify the font color of the chatbox.')
    .addButton(button => button
        .setButtonText('Restore Default')
        .setIcon('rotate-cw')
        .setClass('clickable-icon')
        .onClick(async () => {
            const defaultValue = colorToHex(defaultChatBoxFontColor);
            colorPicker7.setValue(defaultValue);
            
            const textarea = document.querySelector('.chatbox textarea') as HTMLElement;
            if (textarea) {
                textarea.style.color = defaultValue;
                
                // Set the placeholder color to the default value
                const style = document.createElement('style');
                style.textContent = `
                    .chatbox textarea::placeholder {
                        color: ${defaultValue} !important;
                    }
                `;
                textarea.appendChild(style);
                
                await plugin.saveSettings();
            }
        })
    )
    .addColorPicker(async (color) => {
        colorPicker7 = color;
        
        let defaultValue = plugin.settings.appearance.chatBoxFontColor;
        
        if (defaultValue == '--text-normal') {
            defaultValue = colorToHex(defaultChatBoxFontColor);
        }
        
        color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.appearance.chatBoxFontColor = hexValue;
                
                const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
                
                if (textarea) {
                    textarea.style.color = hexValue;
                    
                    // Set the placeholder color to the selected value
                    const style = document.createElement('style');
                    style.textContent = `
                        .chatbox textarea::placeholder {
                            color: ${hexValue} !important;
                        }
                    `;
                    textarea.appendChild(style);
                }
                await plugin.saveSettings();
            });
    });
    
    new Setting(settingsContainer)
    .setName('Chatbox Background Color')
    .setDesc('Modify the background color of the chatbox.')
    .addButton(button => button
        .setButtonText('Restore Default')
        .setIcon('rotate-cw')
        .setClass('clickable-icon')
        .onClick(async () => {
            const defaultValue = colorToHex(defaultChatBoxBackgroundColor);
            colorPicker8.setValue(defaultValue);
            
            const chatbox = document.querySelector('.chatbox');
            if (chatbox) {
                const element = chatbox as HTMLElement;
                element.style.backgroundColor = defaultValue;
                element.style.borderColor = defaultValue;
                await plugin.saveSettings();
            }
        })
    )
    .addColorPicker(async (color) => {
        colorPicker8 = color;
        
        let defaultValue = plugin.settings.appearance.chatBoxBackgroundColor;
        
        if (defaultValue == '--interactive-accent') {
            defaultValue = colorToHex(defaultChatBoxBackgroundColor);
        }
        
        color.setValue(defaultValue)
            .onChange(async (value) => {
                const hexValue = colorToHex(value);
                plugin.settings.appearance.chatBoxBackgroundColor = hexValue;
                
                const chatbox = document.querySelector('.chatbox');
                if (chatbox) {
                    const element = chatbox as HTMLElement;
                    element.style.backgroundColor = hexValue;
                    element.style.borderColor = hexValue;
                }
                
                const textarea = document.querySelector('.chatbox textarea');
                if (textarea) {
                    const element = textarea as HTMLElement;
                    element.style.backgroundColor = hexValue;
                    element.style.borderColor = hexValue;
                }

                const submitButton = document.querySelector('.chatbox .submit-button');
                if (submitButton) {
                    const element = submitButton as HTMLElement;
                    element.style.backgroundColor = hexValue;
                    element.style.borderColor = hexValue;
                }

                await plugin.saveSettings();
            });
    });
}
