# BMO Chatbot for Obsidian
Generate and brainstorm ideas while creating your notes using Large Language Models (LLMs) such as OpenAI's 'gpt-3.5-turbo' and 'gpt-4' for Obsidian.

![Screenshot-1](README_images/Screenshot-1.png)
<p align="center">
  <img src="README_images/Screenshot-2.png" alt="Description of image">
</p>

## Features
- **Chat from anywhere in Obsidian:** Chat with your bot from anywhere within Obsidian.
- **Chatbot responds in Markdown:** Receive formatted responses in Markdown for consistency.
- **Customizable bot name:** Personalize the chatbot's name.
- **System role prompt:** Configure the chatbot to prompt for user roles before responding to messages.
- **Set Max Tokens and Temperature:** Customize the length and randomness of the chatbot's responses with Max Tokens and Temperature settings.
- **System theme color accents:** Seamlessly matches the chatbot's interface with your system's color scheme.
- **Interact with self-hosted Large Language Models (LLMs) using LocalAI:** Use the REST API URL provided to interact with self-hosted Large Language Models (LLMs) using [LocalAI](https://github.com/go-skynet/LocalAI).

## Requirements
To use this plugin, you'll need an OpenAI account with API access. If you don't have an account yet, you can sign up for one on the [OpenAI website](https://platform.openai.com/overview).

Additionally, if you want to interact with self-hosted API LLM(s) models using [LocalAI](https://github.com/go-skynet/LocalAI), you will need to have the self-hosted API set up and running. You can follow the instructions provided by the self-hosted API provider to get it up and running. Once you have the REST API URL for your self-hosted API, you can use it with this plugin to interact with your models.

Explore some models at [GPT4ALL](https://gpt4all.io/index.html) under the "Model Explorer" section.

## How to activate the plugin
Two methods:

Obsidian Community plugins (**Recommended**):
  1. Search for "BMO Chatbot" in the Obsidian Community plugins.
  2. Enable "BMO Chatbot" in the settings.

To activate the plugin from this repo:
  1. Navigate to the plugin's folder in your terminal.
  2. Run `npm install` to install any necessary dependencies for the plugin.
  3. Once the dependencies have been installed, run `npm run build` to build the plugin.
  4. Once the plugin has been built, it should be ready to activate.

## Getting Started
To start using the plugin, enable it in your settings menu and enter your OpenAPI key. After completing these steps, you can access the bot panel by clicking on the bot icon in the left sidebar.

If you want to clear the chat history, simply click on the bot icon again in the left ribbon bar.

## Other Notes
"BMO" is a tag name for this project, inspired by the character BMO from the animated TV show "Adventure Time."

## Contributing
Feel free to create a PR!

If you have any improvements, questions, or concerns, please let me know!
