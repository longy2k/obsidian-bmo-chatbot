import { Plugin, TFile } from 'obsidian';
import { BMOView, VIEW_TYPE_CHATBOT} from './view';
import { BMOSettingTab } from './settings';
import { promptSelectGenerateCommand, renameTitleCommand } from './components/editor/EditorCommands';

export interface BMOSettings {
	general: {
		model: string,
		system_role: string,
		max_tokens: string,
		temperature: string,
		allowReferenceCurrentNote: boolean,
	},
	appearance: {
		userName: string,
		chatbotName: string,
		userMessageBackgroundColor: string,
		botMessageBackgroundColor: string,
		chatBoxBackgroundColor: string,
		chatBoxBorderColor: string,
		allowHeader: boolean,
	},
	editor: {
		system_role_prompt_select_generate: string,
	},
	chatHistory: {
		chatHistoryPath: string,
		templateFilePath: string,
		allowRenameNoteTitle: boolean,
	}
	prompts: {
		promptFolderPath: string,
		prompt: string,
	},
	OllamaConnection: {
		RESTAPIURL: string,
		allowStream: boolean,
		ollamaParameters: {
			mirostat: string,
			mirostat_eta: string,
			mirostat_tau: string,
			num_ctx: string,
			num_gqa: string,
			num_thread: string,
			repeat_last_n: string,
			repeat_penalty: string,
			seed: string,
			stop: string[],
			tfs_z: string,
			top_k: string,
			top_p: string,
			keep_alive: string,
		},
		ollamaModels: string[],
	},
	RESTAPIURLConnection: {
		APIKey: string,
		RESTAPIURL: string,
		allowStream: boolean,
		RESTAPIURLModels: string[],
	},
	APIConnections: {
		anthropic: {
			APIKey: string,
			anthropicModels: string[],
		},
		googleGemini: {
			APIKey: string,
			geminiModels: string[],
		},
		mistral: {
			APIKey: string,
			allowStream: boolean,
			mistralModels: string[],
		},
		openAI: {
			APIKey: string,
			openAIBaseUrl: string,
			allowStream: boolean,
			openAIBaseModels: string[],
		},
		openRouter: {
			APIKey: string,
			allowStream: boolean,
			openRouterModels: string[],
		},
	},
	toggleGeneralSettings: boolean,
	toggleAppearanceSettings: boolean,
	toggleEditorSettings: boolean,
	toggleChatHistorySettings: boolean,
	togglePromptSettings: boolean,
	toggleAPIConnectionSettings: boolean,
	toggleOpenAISettings: boolean,
	toggleMistralSettings: boolean,
	toggleGoogleGeminiSettings: boolean,
	toggleAnthropicSettings: boolean,
	toggleRESTAPIURLSettings: boolean,
	toggleOpenRouterSettings: boolean,
	toggleOllamaSettings: boolean,
	toggleAdvancedSettings: boolean,
	allModels: string[],
}

export const DEFAULT_SETTINGS: BMOSettings = {
	general: {
		model: '',
		system_role: 'You are a helpful assistant.',
		max_tokens: '',
		temperature: '1.00',
		allowReferenceCurrentNote: false,
	},
	appearance: {
		userName: 'USER',
		chatbotName: 'BMO',
		userMessageBackgroundColor: '--background-primary',
		botMessageBackgroundColor: '--background-secondary',
		chatBoxBackgroundColor: '--interactive-accent',
		chatBoxBorderColor: '--interactive-accent',
		allowHeader: true,
	},
	editor: {
		system_role_prompt_select_generate: 'You are a helpful assistant.',
	},
	chatHistory: {
		chatHistoryPath: 'BMO/',
		templateFilePath: '',
		allowRenameNoteTitle: false,
	},
	prompts: {
		promptFolderPath: '',
		prompt: '',
	},
	OllamaConnection: {
		RESTAPIURL: '',
		allowStream: false,
		ollamaParameters: {
			keep_alive: '',
			mirostat: '0',
			mirostat_eta: '0.1',
			mirostat_tau: '5.0',
			num_ctx: '2048',
			num_gqa: '',
			num_thread: '',
			repeat_last_n: '64',
			repeat_penalty: '1.1',
			seed: '',
			stop: [],
			tfs_z: '1.0',
			top_k: '40',
			top_p: '0.9',
		},
		ollamaModels: [],
	},
	RESTAPIURLConnection: {
		APIKey: '',	
		RESTAPIURL: '',
		allowStream: false,
		RESTAPIURLModels: [],
	},
	APIConnections: {
		anthropic: {
			APIKey: '',
			anthropicModels: [],
		},
		googleGemini: {
			APIKey: '',
			geminiModels: [],
		},
		mistral: {
			APIKey: '',
			allowStream: false,
			mistralModels: [],
		},
		openAI: {
			APIKey: '',
			openAIBaseUrl: 'https://api.openai.com/v1',
			allowStream: true,
			openAIBaseModels: [],
		},
		openRouter: {
			APIKey: '',
			allowStream: false,
			openRouterModels: [],
		},
	},
	toggleGeneralSettings: true,
	toggleAppearanceSettings: false,
	toggleEditorSettings: false,
	toggleChatHistorySettings: false,
	togglePromptSettings: false,
	toggleAPIConnectionSettings: true,
	toggleOpenAISettings: false,
	toggleMistralSettings: false,
	toggleGoogleGeminiSettings: false,
	toggleAnthropicSettings: false,
	toggleRESTAPIURLSettings: true,
	toggleOpenRouterSettings: false,
	toggleOllamaSettings: true,
	toggleAdvancedSettings: false,
	allModels: [],
}

export let checkActiveFile: TFile | null = null;

export default class BMOGPT extends Plugin {
	settings: BMOSettings;

	async onload() {
		await this.loadSettings();

		// BUG??
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleFileSwitch();
            })
        );

		this.registerView(
			VIEW_TYPE_CHATBOT,
			(leaf) => new BMOView(leaf, this.settings, this)
		);

		this.addRibbonIcon('bot', 'BMO Chatbot', () => {
			this.activateView();
		});

		this.addCommand({
            id: 'open-bmo-chatbot',
            name: 'Open BMO Chatbot',
            callback: () => {
                this.activateView();
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '0',
				},
            ],
        });

		this.addCommand({
            id: 'rename-note-title',
            name: 'Rename Note Title',
            callback: () => {
				renameTitleCommand(this, this.settings);
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '\'',
				},
            ],
        });

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile)) {
					return;
				}
	
				menu.addItem((item) => {
					item
						.setTitle('BMO Chatbot: Generate new title')
						.onClick(() => renameTitleCommand(this, this.settings));
				});
			})
		);

		this.addCommand({
            id: 'prompt-select-generate',
            name: 'Prompt Select Generate',
            callback: () => {
				promptSelectGenerateCommand(this, this.settings);
            },
            hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: '=',
				},
            ],
        });

		this.addSettingTab(new BMOSettingTab(this.app, this));
	}

	handleFileSwitch() {
		checkActiveFile = this.app.workspace.getActiveFile();
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT).forEach((leaf) => {
			const bmoView = leaf.view as BMOView;
	
			if (bmoView) {
				this.saveSettings();
				bmoView.cleanup();
			} 
		});
		
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHATBOT);
	
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		await rightLeaf?.setViewState({
			type: VIEW_TYPE_CHATBOT,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		// Focus on the textarea
		const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
	
		if (textarea) {
			textarea.style.opacity = '0';
			textarea.style.transition = 'opacity 1s ease-in-out';
	
			setTimeout(() => {
				textarea.focus();
				textarea.style.opacity = '1';
			}, 50); 
		}
	
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		const messageContainer = document.querySelector('#messageContainer');
		if (messageContainer) {
			messageContainer.scroll({
				top: messageContainer.scrollHeight, 
				behavior: 'smooth' 
			});
		}
	}
	

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}