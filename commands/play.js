const { play } = require("../handler/play");
const { CommandInteraction, Client } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice")
const ytdl = require("ytdl-core");
const { default: scrape } = require("scrape-youtube");

module.exports = {
    name: "play",
    description: "Playing song",
    options: [{
        name: "input",
        description: "Input title or link of the song that you want",
        type: 3,
        required: true
    }],
    /**
     * @param {CommandInteraction} interaction 
     * @param {Client} client 
     * @param {string} value 
     */
    async run(interaction, client, value) {
        const { channel } = interaction.member.voice;
        if(!channel) return interaction.reply({ content: "You must join voice channel first!", ephemeral: true });
        
        const permission = channel.permissionsFor(client.user);
        if(!permission.has("CONNECT")) return interaction.reply({ content: "I don't have permission to connect the voice channel!", ephemeral: true });
        if(!permission.has("SPEAK")) return interaction.reply({ content: "I can't speak inside voice channel!", ephemeral: true });

        const videoPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
        const urlValid = videoPattern.test(value);

        const serverQueue = client.queue.get(interaction.guildId);
        const queueConstruct = {
            textChannel: interaction.channel,
            channel,
            loop: false,
            songs: [],
            connection: null,
            audioPlayer: null,
            resource: null,
            volume: 100,
            playing: true
        };

        let song = null;
        let songInfo = null;

        if(urlValid) {
            try {
                songInfo = await ytdl.getInfo(value);
                song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    userPlayer: interaction.user
                }
            } catch (error) {
                interaction.reply({ content: "There's something wrong! Please try again", ephemeral: true });
                return console.log(error);
            }
        } else {
            try {
                let results = await scrape.search(value);
                songInfo = await ytdl.getInfo(results.videos[0].link);
                song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    userPlayer: interaction.user
                }
            } catch (error) {
                interaction.reply({ content: "There's something wrong! Please try again", ephemeral: true });
                return console.log(error);
            }
        }

        if(serverQueue) {
            if(interaction.guild.me.voice.channelId !== channel.id) return interaction.reply({ content: "You must join the same voice channel as me!", ephemeral: true });
            serverQueue.songs.push(song);
            interaction
                .reply({ content: `Added: ${song.title} to queue - ${song.userPlayer.tag}` })
                .catch(console.error);
        } else {
            queueConstruct.songs.push(song);
            interaction
                .reply({ content: `Added: ${song.title} to queue - ${song.userPlayer.tag}` })
                .catch(console.error);
        }

        const connection = joinVoiceChannel({
            guildId: interaction.guildId,
            channelId: channel.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        if(!serverQueue) client.queue.set(interaction.guildId, queueConstruct);
        if(!serverQueue) {
            try {
                queueConstruct.connection = connection;
                play(queueConstruct.songs[0], interaction, client);
            } catch (error) {
                console.log(error);
                connection.destroy();
                client.queue.delete(interaction.guildId);
                return interaction.channel.send({ content: "There's something wrong! Connectio aborted." });
            }
        }
    }
}