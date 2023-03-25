# Obsidian Chatbot
A work in progress Obsidian plugin that utilizes the Openai API "gpt-3.5-turbo" model.

![Screenshot-1](README_images/Screenshot-1.png)
<p align="center">
  <img src="README_images/Screenshot-2.png" alt="Description of image">
</p>


## Getting Started
To get started, enable the plugin in your settings menu and add your OpenAPI key to the plugin. 
Once you've completed these steps, you'll be able to see the bot icon in your left sidebar, 
which you can click on to access the bot panel and start interacting with it.

## Important Note
When you open the chatbot, clicking on the bot icon again will clear the history.

This plugin has not been submitted to the official community plugins yet.
You need to type `npm install` and `npm run build` in the plugin's folder.

## Features
- **Chat from anywhere in Obsidian:** Chat with your bot wherever you are!
- **Chatbot responds in Markdown:** Receive formatted responses in Markdown for consistency.
- **Customizable bot name:** Personalize the chatbot's name.
- **System role prompt:** Configure the chatbot to prompt for user roles before responding to messages.
- **Set Max Tokens and Temperature:** Customize the length and randomness of the chatbot's responses with Max Tokens and Temperature settings.
- **System theme color accents:** Seamlessly matches the chatbot's interface with your system's color scheme.

### Command Palette
- **Execute Prompt (within current note):** Your entire note will be processed through the API and output right back into the note.

## Contributing
Feel free to improve the plugin!
