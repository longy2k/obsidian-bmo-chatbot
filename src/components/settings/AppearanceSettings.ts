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
        .setName('User Name')
        .setDesc('Create a username.')
        .addText(text => text
            .setPlaceholder('Enter user name')
            .setValue(plugin.settings.appearance.userName || DEFAULT_SETTINGS.appearance.userName)
            .onChange(async (value) => {
                plugin.settings.appearance.userName = value ? value.toUpperCase() : DEFAULT_SETTINGS.appearance.userName;
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
    const defaultUserMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.userMessageBackgroundColor).trim();
    
    new Setting(settingsContainer)
        .setName('User Message Background Color')
        .setDesc('Modify the background color of the userMessage element.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
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

    let colorPicker2: ColorComponent;
    const defaultBotMessageBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.botMessageBackgroundColor).trim();

    new Setting(settingsContainer)
        .setName('Bot Message Background Color')
        .setDesc('Modify the background color of the botMessage element.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
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

    let colorPicker3: ColorComponent;
    const defaultChatBoxBackgroundColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxBackgroundColor).trim();

    new Setting(settingsContainer)
        .setName('Chatbox Background Color')
        .setDesc('Modify the background color of the chatbox.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultChatBoxBackgroundColor);
                colorPicker3.setValue(defaultValue);
    
                const textarea = document.querySelector('.chatbox textarea');
                if (textarea) {
                    const element = textarea as HTMLElement;
                    element.style.backgroundColor = defaultValue;
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker3 = color;

            let defaultValue = plugin.settings.appearance.chatBoxBackgroundColor;

            if (defaultValue == '--interactive-accent') {
                defaultValue = colorToHex(defaultChatBoxBackgroundColor);
            }

            color.setValue(defaultValue)
                .onChange(async (value) => {
                    const hexValue = colorToHex(value);
                    plugin.settings.appearance.chatBoxBackgroundColor = hexValue;
                    const textarea = document.querySelector('.chatbox textarea');
                    if (textarea) {
                        const element = textarea as HTMLElement;
                        element.style.backgroundColor = hexValue;
                        element.style.borderColor = hexValue;
                    }
            await plugin.saveSettings();
        });
    });

    let colorPicker4: ColorComponent;
    const defaultChatBoxBorderColor = getComputedStyle(document.body).getPropertyValue(DEFAULT_SETTINGS.appearance.chatBoxBorderColor).trim();

    new Setting(settingsContainer)
        .setName('Chatbox Border Color')
        .setDesc('Modify the border color of the chatbox.')
        .addButton(button => button
            .setButtonText('Restore Default')
            .setIcon('rotate-cw')
            .setClass('clickable-icon')
            .onClick(async () => {
                const defaultValue = colorToHex(defaultChatBoxBorderColor);
                colorPicker4.setValue(defaultValue);
    
                const textarea = document.querySelector('.chatbox');
                if (textarea) {
                    const element = textarea as HTMLElement;
                    element.style.backgroundColor = defaultValue;
                }
            })
        )
        .addColorPicker((color) => {
            colorPicker4 = color;

            let defaultValue = plugin.settings.appearance.chatBoxBorderColor;

            if (plugin.settings.appearance.chatBoxBorderColor == '--interactive-accent') {
                defaultValue = colorToHex(defaultChatBoxBorderColor);
            }

            color.setValue(defaultValue)
                .onChange(async (value) => {
                    const hexValue = colorToHex(value);
                    plugin.settings.appearance.chatBoxBorderColor = hexValue;
                    const textarea = document.querySelector('.chatbox');
                    if (textarea) {
                        const element = textarea as HTMLElement;
                        element.style.backgroundColor = hexValue;
                        element.style.borderColor = hexValue;
                    }
            await plugin.saveSettings();
        });
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
}
