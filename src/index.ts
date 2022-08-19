import { config } from 'dotenv';
config();

import './api';

import { GuildConfiguration, initialize as initializeDatabase, Post, Postgres, PostMessage, UserVote } from './database';
import { loadContextMenus, loadMessageCommands, loadSlashCommands, synchronizeSlashCommands } from './handlers/commands';

import { syncSheets } from './integrations/sheets';

import fetch from 'node-fetch';

import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder, IntentsBitField, InteractionType, TextChannel } from 'discord.js';
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

            await interaction.deferReply();

            const projectName = interaction.fields.getTextInputValue('project_name');
            const projectDescription = interaction.fields.getTextInputValue('project_description');
            let projectTwitterUrl = interaction.fields.getTextInputValue('project_twitter_url');
            if (!projectTwitterUrl.startsWith('https://')) projectTwitterUrl = `https://${projectTwitterUrl}`;
            const projectTwitterUsername = projectTwitterUrl.split('/').pop();
            const projectImageUrl = interaction.fields.getTextInputValue('project_image_url');

            const postInsert = await Postgres.getRepository(Post).insert({
                projectName,
                projectDescription,
                projectTwitterUrl,
                projectImageUrl
            });
            const postId = postInsert.identifiers[0].id as number;

            const postData = await Postgres.getRepository(Post).findOne({
                where: {
                    id: postId
                }
            }) as Post;

            await fetch(`https://maker.ifttt.com/trigger/earlylink_post/json/with/key/${process.env.IFTTT_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    linkedAccountName: projectTwitterUsername,
                    imageUrl: projectImageUrl
                })
            });

            const configurations = await Postgres.getRepository(GuildConfiguration).find({
                where: {
                    channelId: Not(IsNull())
                }
            });

            configurations.forEach(async (configuration) => {
                if (!configuration.channelId) {
                    console.log('No channel ID set for guild configuration');
                }
                client.channels.fetch(configuration.channelId).then((channel) => {
                    console.log(`Getting channel ${configuration.channelId} (${channel?.id})`);
                    if (channel?.type === ChannelType.GuildText) {
                        const notificationEmbed = new EmbedBuilder()
                            .setTitle(`${projectName} has been selected by EarlyLink`)
                            .setDescription(projectDescription)
                            .setURL(projectTwitterUrl)
                            .setImage(projectImageUrl)
                            .setColor(process.env.EMBED_COLOR)
                            .setFooter({
                                text: `This channel will continue to receive EarlyLink selections 🌟`
                            });
                        const row = new ActionRowBuilder()
                            .setComponents([
                                new ButtonBuilder()
                                    .setLabel('Upote')
                                    .setCustomId(`upvote_1_${postId}`)
                                    .setStyle(ButtonStyle.Success)
                            ]) as ActionRowBuilder<ButtonBuilder>;
                        channel.send({
                            content: configuration.roleId ? `<@&${configuration.roleId}>` : '',
                            embeds: [notificationEmbed],
                            components: configuration.isVerifiedDAO ? [row] : []
                        })
                        .then((message) => {
                            Postgres.getRepository(PostMessage).insert({
                                messageId: message.id,
                                channelId: message.channel.id,
                                guildId: message.guild!.id,
                                post: postData
                            });
                            console.log(`Successfully sent message to channel ${message.channel.id}`);
                        })
                        .catch((e) => {});
                    }
                }).catch((e) => console.error(e))
            });

            return void interaction.followUp(successEmbed(`Post created`));
        }
    }

    if (interaction.isButton()) {

        const customId = interaction.customId;
        if (!customId.startsWith('upvote')) return;
        const [,_points,_postId] = customId.split('_');
        const points = parseInt(_points);
        const postId = parseInt(_postId);
        const post = await Postgres.getRepository(Post).findOne({
            where: {
                id: postId
            }
        });
        if (!post) {
            return void interaction.reply({
                ephemeral: true,
                content: `The project you are trying to vote for does not exist anymore.`
            });
        }

        const userVote = await Postgres.getRepository(UserVote).findOne({
            where: {
                post: {
                    id: postId
                },
                userId: interaction.user.id,
                guildId: interaction.guildId!
            }
        });

        if (userVote) {
            userVote.voteValue = points;
            await Postgres.getRepository(UserVote).save(userVote);
            void interaction.reply({
                ephemeral: true,
                content: `You already voted for this project. Your vote has successfully been updated.`
            });
        } else {
            await Postgres.getRepository(UserVote).insert({
                post,
                userId: interaction.user.id,
                voteValue: points,
                guildId: interaction.guildId!
            });
            void interaction.reply({
                ephemeral: true,
                content: `You have successfully voted for this project.`
            });
        }

    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        if (interaction.commandName === 'verify-dao' || interaction.commandName === 'unverify-dao') {
            const serverName = interaction.options.getFocused();
            return interaction.respond(interaction.client.guilds.cache.filter((g) => !serverName || g.name.includes(serverName)).map((g) => ({
                name: g.name,
                value: g.id
            })).slice(0, 25));
        }
        if (interaction.commandName === 'del-post' || interaction.commandName === 'edit-post') {
            const posts = await Postgres.getRepository(Post).find();
            const projectName = interaction.options.getFocused();
            return interaction.respond(posts.filter((p) => !projectName || p.projectName.includes(projectName)).map((p) => ({
                name: p.projectName,
                value: p.id
            })).slice(0, 25));
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

    client.user?.setActivity('earlylink.io');
    setInterval(() => {
        client.user?.setActivity('earlylink.io');
    }, 10 * 60 * 1000);
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
