require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ],
    componentsV2: true,
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.prefixes = ['!'];

// Slash Command Handler
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Prefix Command Handler
const prefixCommandsPath = path.join(__dirname, 'prefix_commands');
if (!fs.existsSync(prefixCommandsPath)) fs.mkdirSync(prefixCommandsPath);
const prefixFiles = fs.readdirSync(prefixCommandsPath).filter(file => file.endsWith('.js'));
for (const file of prefixFiles) {
    const filePath = path.join(prefixCommandsPath, file);
    const command = require(filePath);
    client.prefixCommands.set(command.name, command);
}

// Event Handler
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

client.login(process.env.DISCORD_TOKEN);
