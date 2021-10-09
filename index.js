require("dotenv").config();
const fs = require("fs");
const { Client, Intents, Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
    partials: ["CHANNEL", "MESSAGE", "GUILD_MEMBER", "USER"]
})

let slashCommands = [];
client.queue = new Map();
client.slashCommands = new Collection();
client.login(process.env.TOKEN);

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith("js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    slashCommands.push(command);
    client.slashCommands.set(command.name, command);
}

const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
(async() => {
    try {
        console.log("Refreshing slash commands (/)");

        await rest.put(Routes.applicationGuildCommands("836814182061309973", "772740285221699624"), { body: slashCommands });

        console.log("Successfully refresh slash commands");
    } catch (error) {
        console.log(error);
    }
})();

console.log(slashCommands);

client.on("ready", () => {
    console.log("The bot its ready!");
});

client.on("interactionCreate", async(interaction) => {
    if(interaction.isCommand) {
        const command = client.slashCommands.get(interaction.commandName);
        if(command) {
            const value = interaction.options.getString("input");
            return command.run(interaction, client, value);
        }
    }
});