import { Plugin } from 'obsidian';
import { Configuration, OpenAIApi } from "openai";
import { BMOView, VIEW_TYPE_CHATBOT, setMessageHistory } from "./view";
import { BMOSettingTab } from './settings';

// Remember to rename these classes and interfaces!
export interface BMOSettings {
	models: any;
	apiKey: string;
	max_tokens: string;
	model: string;
	system_role: string;
	temperature: string;
	userName: string;
	chatbotName: string;
	chatbotContainerBackgroundColor: string;
	userMessageBackgroundColor: string;
	botMessageBackgroundColor: string;
	restAPIUrl: string;
}

export const DEFAULT_SETTINGS: BMOSettings = {
	apiKey: '',
	max_tokens: '',
	model: 'gpt-3.5-turbo-0301',
	system_role: '',
	temperature: '',
	userName: 'USER',
	chatbotName: 'BOT',
	chatbotContainerBackgroundColor: '--background-secondary',
	userMessageBackgroundColor: '--background-primary',
	botMessageBackgroundColor: '--background-secondary',
	restAPIUrl: '',
	models: undefined,
}

export default class BMOGPT extends Plugin {
	settings: BMOSettings;
	openai: OpenAIApi;

	resetMessageHistory() {
		setMessageHistory("");
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CHATBOT,
			(leaf) => new BMOView(leaf, this.settings)
		);

		this.addRibbonIcon("bot", "Chatbot (Clear Conversation)", () => {
			this.resetMessageHistory();
		    this.activateView();
		});

		const configuration = new Configuration({
			apiKey: this.settings.apiKey,
		});

		this.openai = new OpenAIApi(configuration);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BMOSettingTab(this.app, this));
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT).forEach((leaf) => {
		  const bmoView = leaf.view as BMOView;
	  
		  if (bmoView) {
			bmoView.cleanup();
		  }
		  
		});
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHATBOT);
	
		await this.app.workspace.getRightLeaf(false).setViewState({
		  type: VIEW_TYPE_CHATBOT,
		  active: true,
		});
	
		this.app.workspace.revealLeaf(
		  this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

