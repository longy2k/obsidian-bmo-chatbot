import { SettingTab, setIcon } from "obsidian";
import BMOGPT from "src/main";
import { addOpenAIConnectionSettings } from "./APIConnections/OpenAIConnections";
import { addMistralConnectionSettings } from "./APIConnections/MistralConnections";
import { addGoogleGeminiConnectionSettings } from "./APIConnections/GoogleGeminiConnections";
import { addAnthropicConnectionSettings } from "./APIConnections/AnthropicConnections";

export function addAPIConnectionSettings(containerEl: HTMLElement, plugin: BMOGPT, SettingTab: SettingTab) {
    const toggleSettingContainer = containerEl.createDiv({ cls: 'toggleSettingContainer' });
    toggleSettingContainer.createEl('h2', { text: 'API Connections' });

    const initialState = plugin.settings.toggleAPIConnectionSettings;
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
            plugin.settings.toggleAPIConnectionSettings = false;

        } else {
            setIcon(chevronIcon, 'chevron-down'); // Open state
            settingsContainer.style.display = 'block';
            plugin.settings.toggleAPIConnectionSettings = true;
        }
        await plugin.saveSettings();
    });

    addOpenAIConnectionSettings(settingsContainer, plugin, SettingTab);
    addMistralConnectionSettings(settingsContainer, plugin, SettingTab);
    addGoogleGeminiConnectionSettings(settingsContainer, plugin, SettingTab);
    addAnthropicConnectionSettings(settingsContainer, plugin, SettingTab);
}

