# Obsidian Chatbot
A chatbot Obsidian plugin that integrates Large Language Models (LLMs) such as OpenAI's "gpt-3.5-turbo".

![Screenshot-1](README_images/Screenshot-1.png)
<p align="center">
  <img src="README_images/Screenshot-2.png" alt="Description of image">
</p>

## How to activate the plugin
Two methods:

- Obsidian Community plugins (currently in review):
1. Search for "BMO Chatbot" in the Obsidian Community plugins.
2. Enable "BMO Chatbot" in the settings.

- To activate the plugin from this repo, please follow these steps:
1. Navigate to the plugin's folder in your terminal.
2. Run `npm install` to install any necessary dependencies for the plugin.
3. Once the dependencies have been installed, run `npm run build` to build the plugin.
4. Once the plugin has been built, it should be ready to activate.

## Requirements
### OpenAI API
In order to use this plugin, you will need to have an OpenAI account and API access. 
<!-- Please note that GPT-4 can only be used if you have access to the API.  -->
If you don't have an account yet, you can sign up for one on the [OpenAI website](https://platform.openai.com/overview).
Once you have your account, you can access your API key and enter it into the plugin settings to start using the chatbot.

## Getting Started
To get started, enable the plugin in your settings menu and add your OpenAPI key to the plugin. 
Once you've completed these steps, you'll be able to see the bot icon in your left sidebar, 
which you can click on to access the bot panel and start interacting with it.

When you open the chatbot, clicking on the left ribbon bar bot icon again will clear the history.

## Features
- **Chat from anywhere in Obsidian:** Chat with your bot wherever you are!
- **Chatbot responds in Markdown:** Receive formatted responses in Markdown for consistency.
- **Customizable bot name:** Personalize the chatbot's name.
- **System role prompt:** Configure the chatbot to prompt for user roles before responding to messages.
- **Set Max Tokens and Temperature:** Customize the length and randomness of the chatbot's responses with Max Tokens and Temperature settings.
- **System theme color accents:** Seamlessly matches the chatbot's interface with your system's color scheme.

## Other Notes
"BMO" is just a tag name for the project.

## Contributing
Feel free to improve the plugin!
If you have any improvements, questions, or concerns, just let me know!
