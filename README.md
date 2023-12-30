# BMO Chatbot for Obsidian
Generate and brainstorm ideas while creating your notes using Large Language Models (LLMs) such as OpenAI's "gpt-3.5-turbo" and "gpt-4" for Obsidian.

![Screenshot-1](README_images/Screenshot-1.png)
<p align="center">
  <img src="README_images/Screenshot-2.png" alt="Description of image">
</p>

## Features
- **Interact with self-hosted Large Language Models (LLMs):** Use the REST API URL provided to interact with self-hosted Large Language Models (LLMs) using [Ollama](https://ollama.ai) or [LocalAI](https://github.com/go-skynet/LocalAI).
- **Chat from anywhere in Obsidian:** Chat with your bot from anywhere within Obsidian.
- **Chat with current note:** Use your chatbot to reference and engage within your current note.
- **Chatbot responds in Markdown:** Receive formatted responses in Markdown for consistency.
- **Customizable bot name:** Personalize the chatbot's name.
- **System role prompt:** Configure the chatbot to prompt for user roles before responding to messages.
- **System theme color accents:** Seamlessly matches the chatbot's interface with your system's color scheme.
- **Custom prompts in Markdown:** Create custom prompts in Markdown to interact with your models.
- **Prompt Select Generate:** Prompt, select, and generate within your editor.
- **Save current chat history as markdown:** Use the `/save` command in chat to save current conversation.

## Requirements
To use this plugin, you'll need an OpenAI account with API access. If you don't have an account yet, you can sign up for one on the [OpenAI website](https://platform.openai.com/overview).

Additionally, if you want to interact with self-hosted Large Language Models (LLMs) using [Ollama](https://ollama.ai) or [LocalAI](https://github.com/go-skynet/LocalAI), you will need to have the self-hosted API set up and running. You can follow the instructions provided by the self-hosted API provider to get it up and running. Once you have the REST API URL for your self-hosted API, you can use it with this plugin to interact with your models.

Please see [instructions](https://github.com/longy2k/obsidian-bmo-chatbot/wiki) to setup Ollama with Obsidian.

Explore some models at [GPT4ALL](https://gpt4all.io/index.html) under the "Model Explorer" section or [Ollama's Library](https://ollama.ai/library).

## How to activate the plugin
Three methods:

Obsidian Community plugins (**Recommended**):
  1. Search for "BMO Chatbot" in the Obsidian Community plugins.
  2. Enable "BMO Chatbot" in the settings.

To activate the plugin from this repo:
  1. Navigate to the plugin's folder in your terminal.
  2. Run `npm install` to install any necessary dependencies for the plugin.
  3. Once the dependencies have been installed, run `npm run build` to build the plugin.
  4. Once the plugin has been built, it should be ready to activate.

Install using Beta Reviewers Auto-update Tester ([BRAT](https://github.com/TfTHacker/obsidian42-brat)) - [Quick guide for using BRAT](https://tfthacker.com/Obsidian+Plugins+by+TfTHacker/BRAT+-+Beta+Reviewer's+Auto-update+Tool/Quick+guide+for+using+BRAT)

1. Search for "Obsidian42 - BRAT" in the Obsidian Community plugins.
2. Open the command palette and run the command `BRAT: Add a beta plugin for testing` (If you want the plugin version to be frozen, use the command `BRAT: Add a beta plugin with frozen version based on a release tag`.)
3. Paste "https://github.com/longy2k/obsidian-bmo-chatbot".
4. Click on "Add Plugin".
5. After BRAT confirms the installation, in Settings go to the Community plugins tab.
6. Refresh the list of plugins.
7. Find the beta plugin you just installed and enable it.

## Getting Started
To start using the plugin, enable it in your settings menu and enter your OpenAI API key. After completing these steps, you can access the bot panel by clicking on the bot icon in the left sidebar.

## Commands
- `/help` - Show help commands.
- `/model` - List or change model.
	- `/model 1` or `/model "gpt-3.5-turbo"`
 	- `/model 2` or `/model "gpt-3.5-turbo-1106"`
    - ...
- `/prompt` - List or change prompt.
	- `/prompt 1` or `/prompt "[PROMPT-NAME]"`
- `/prompt clear` or `/prompt c` - Clear prompt.
- `/system` - Change system prompt.
	- `/system "WRITE IN ALL CAPS!"`
- `/maxtokens [VALUE]` - Set max tokens.
- `/temp [VALUE]` - Change temperature range from 0 to 1.
- `/ref on | off` - Turn on or off reference current note.
- `/append` - Append current chat history to current active note.
- `/save` - Save current chat history to a note.
- `/clear` or `/c` - Clear chat history.
- `/stop` or `/s` - Stop fetching response.

## Supported Models
- OpenAI
  - gpt-3.5-turbo
  - gpt-3.5-turbo-1106
    - Newest gpt-3.5-turbo model with a context window of 16,385 tokens, replacing gpt-3.5-turbo-16k.
    - Same pricing as gpt-3.5-turbo.
  - gpt-4 (Context window: 8,192 tokens)
  - gpt-4-1106-preview (Context window: 128,000 tokens)
- Any self-hosted models using [Ollama](https://ollama.ai).
  - See [instructions](https://github.com/longy2k/obsidian-bmo-chatbot/wiki) to setup Ollama with Obsidian.

## Other Supported Models (Low Support)
I would like to continue supporting Anthropic's models, but I no longer have access to the API.

I'm currently prioritizing Ollama over LocalAI due to its simplicity. I may drop LocalAI when
Ollama becomes available on Windows.

- Anthropic
  - claude-instant-1.2
  - claude-2.0
  - claude-2.1
- Any self-hosted models using [LocalAI](https://github.com/go-skynet/LocalAI)

## Other Notes
"BMO" is a tag name for this project, inspired by the character BMO from the animated TV show "Adventure Time."

## Contributing
Any ideas or support is highly appreciated :)

If you have any bugs, improvements, or questions please create an issue or discussion!

<a href='https://ko-fi.com/K3K8PNYT8' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
