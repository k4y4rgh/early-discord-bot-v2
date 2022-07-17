import { config } from 'dotenv';
config();

import { GuildConfiguration, initialize as initializeDatabase, Post, Postgres } from './database';
import { loadContextMenus, loadMessageCommands, loadSlashCommands, synchronizeSlashCommands } from './handlers/commands';

import { syncSheets } from './integrations/sheets';

import fetch from 'node-fetch';

import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, IntentsBitField, InteractionType, TextChannel } from 'discord.js';
import { errorEmbed, successEmbed } from './util';
import { loadTasks } from './handlers/tasks';
import { IsNull, Not } from 'typeorm';
export const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

const { slashCommands, slashCommandsData } = loadSlashCommands(client);
const { contextMenus, contextMenusData } = loadContextMenus(client);
const messageCommands = loadMessageCommands(client);
loadTasks(client);

synchronizeSlashCommands(client, [...slashCommandsData, ...contextMenusData], {
    debug: true,
    guildId: process.env.GUILD_ID
});

client.on('interactionCreate', async (interaction) => {

    if (interaction.type === InteractionType.ModalSubmit) {
        if (interaction.customId === 'new_post_modal') {
            const projectName = interaction.fields.getTextInputValue('project_name');
            const projectDescription = interaction.fields.getTextInputValue('project_description');
            const projectTwitterUrl = interaction.fields.getTextInputValue('project_twitter_url');
            const projectImageUrl = interaction.fields.getTextInputValue('project_image_url');

            const post = await Postgres.getRepository(Post).insert({
                projectName,
                projectDescription,
                projectTwitterUrl,
                projectImageUrl
            });
            const postId = post.identifiers[0].id;

            await fetch(`https://maker.ifttt.com/trigger/earlylink_post/json/with/key/${process.env.IFTTT_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    linkedAccountUrl: projectTwitterUrl,
                    imageUrl: projectImageUrl
                })
            });

            const configurations = await Postgres.getRepository(GuildConfiguration).find({
                where: {
                    channelId: Not(IsNull())
                }
            });

            configurations.forEach(async (configuration) => {
                const channel = client.channels.cache.get(configuration.channelId);
                if (channel instanceof TextChannel) {
                    const notificationEmbed = new EmbedBuilder()
                        .setTitle(`${projectName} has been selected by EarlyLink 🚀`)
                        .setDescription(projectDescription)
                        .setURL('https://' + projectTwitterUrl)
                        .setImage(projectImageUrl)
                        .setColor(process.env.EMBED_COLOR)
                        .setFooter({
                            text: `This channel will continue receiving EarlyLink selections 🌟`
                        });
                    const row = new ActionRowBuilder()
                        .setComponents([
                            new ButtonBuilder()
                                .setLabel('Upvote')
                                .setCustomId(`upvote_${postId}`)
                                //.setEmoji('⬆️')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setLabel('Downvote')
                                .setCustomId(`downvote_${postId}`)
                                //.setEmoji('⬇️')
                                .setStyle(ButtonStyle.Danger)
                        ]) as ActionRowBuilder<ButtonBuilder>;
                    channel.send({
                        embeds: [notificationEmbed],
                        components: [row]
                    });
                }
            });

            return void interaction.reply(successEmbed(`Post created`));
        }
    }

    if (interaction.isChatInputCommand()) {
        const run = slashCommands.get(interaction.commandName);
        if (!run) return void interaction.reply(errorEmbed('Unknown command'));
        run(interaction, interaction.commandName);
    }

    else if (interaction.isContextMenuCommand()) {
        const run = contextMenus.get(interaction.commandName);
        if (!run) return void interaction.reply(errorEmbed('Unknown context menu'));
        run(interaction, interaction.commandName);
    }

});

client.on('messageCreate', (message) => {

    if (message.author.bot) return;

    if (message.channelId === process.env.IMAGE_CONVERTER_CHANNEL_ID) {
        const attachmentUrl = message.attachments.first()?.url;
        if (attachmentUrl) return void message.channel.send('<' + attachmentUrl + '>');
    }


    if (!process.env.COMMAND_PREFIX) return;
    
    const args = message.content.slice(process.env.COMMAND_PREFIX.length).split(/ +/);
    const commandName = args.shift();

    if (!commandName) return;

    const run = messageCommands.get(commandName);
    
    if (!run) return;

    run(message, commandName);

});

client.on('ready', () => {
    console.log(`Logged in as ${client.user!.tag}. Ready to serve ${client.users.cache.size} users in ${client.guilds.cache.size} servers 🚀`);

    if (process.env.DB_NAME) {
        initializeDatabase().then(() => {
            console.log('Database initialized 📦');
        });
    } else {
        console.log('Database not initialized, as no keys were specified 📦');
    }

    if (process.env.SPREADSHEET_ID) {
        syncSheets();
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
