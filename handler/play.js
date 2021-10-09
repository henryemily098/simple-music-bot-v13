const { createAudioPlayer, createAudioResource, entersState, StreamType, VoiceConnectionStatus } = require("@discordjs/voice");
const { CommandInteraction, Client } = require("discord.js");
const ytdlDiscord = require("youtube-dl-exec").raw;

/**
 * @param {*} song 
 * @param {CommandInteraction} interaction 
 * @param {Client} client 
 */
module.exports.play = async(song, interaction, client) => {
    const queue = client.queue.get(interaction.guildId);
    if(!song) {
        queue.connection.disconnect();
        return client.queue.delete(interaction.guildId);
    }

    try {
        var stream = ytdlDiscord(song.url, {
            o: '-',
            q: '',
            f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
            r: '100K'
        }, { stdio: ["ignore", "pipe"] }).stdout;
    } catch (error) {
        if(queue) {
            if(queue.loop) {
                let lastSong = queue.songs.shift();
                queue.songs.push(lastSong);
                module.exports.play(queue.songs[0], interaction, client);
            } else {
                queue.songs.shift();
                module.exports.play(queue.songs[0], interaction, client);
            }
        }
    }

    queue.audioPlayer = createAudioPlayer();
    queue.resource = createAudioResource(stream, { inlineVolume: true, inputType: StreamType.Arbitrary });

    queue.audioPlayer.play(queue.resource);
    try {
        await entersState(queue.connection, VoiceConnectionStatus.Ready, 30_000);
        queue.connection.subscribe(queue.audioPlayer);
    } catch (error) {
        queue.connection.destroy();
        throw error;
    }

    queue.resource.playStream
        .on("end", () => {
            if(playingMessage && playingMessage.deleted) 
                playingMessage.delete().catch(console.error);

            if(queue.loop) {
                let lastSong = queue.songs.shift();
                queue.songs.push(lastSong);
                module.exports.play(queue.songs[0], interaction, client);
            } else {
                queue.songs.shift();
                module.exports.play(queue.songs[0], interaction, client);
            }
        })
        .on("error", (error) => {
            console.log(error);
            if(playingMessage && playingMessage.deleted) 
                playingMessage.delete().catch(console.error);

            if(queue.loop) {
                let lastSong = queue.songs.shift();
                queue.songs.push(lastSong);
                module.exports.play(queue.songs[0], interaction, client);
            } else {
                queue.songs.shift();
                module.exports.play(queue.songs[0], interaction, client);
            }
        });
    
    queue.audioPlayer
        .on("error", (error) => {
            console.log(error);
            if(playingMessage && playingMessage.deleted) 
                playingMessage.delete().catch(console.error);

            if(queue.loop) {
                let lastSong = queue.songs.shift();
                queue.songs.push(lastSong);
                module.exports.play(queue.songs[0], interaction, client);
            } else {
                queue.songs.shift();
                module.exports.play(queue.songs[0], interaction, client);
            }
        });
    try {
        var playingMessage = await queue.textChannel.send({ content: `Playing: ${song.title} by ${song.userPlayer.tag}` });
    } catch (error) {
        console.log(error)
    }
}