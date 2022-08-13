import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, PermissionsBitField, TextChannel } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Post, Postgres, PostMessage } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'del-post',
        description: 'Deletes a post on Discord and on the website',
        options: [
            {
                name: 'post-id',
                description: 'The ID of the post',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            }
        ]
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (!process.env.OWNER_IDS?.split(',').includes(interaction.user!.id)) {
        return void interaction.reply(errorEmbed(`You can't run this command (insufficient permissions).`));
    }

    const postId = parseInt(interaction.options.get('post-id')?.value! as string);
    const postData = await Postgres.getRepository(Post).findOne({
        where: {
            id: postId
        }
    });
    
    if (!postData) {
        return void interaction.reply(errorEmbed(`Post with ID ${postId} not found.`));
    }

    const messages = await Postgres.getRepository(PostMessage).find({
        where: {
            post: {
                id: postId
            }
        }
    });

    messages.forEach(async (msg) => {

        const guild = interaction.client.guilds.cache.get(msg.guildId);
        if (!guild) return;
        const channel = guild.channels.cache.get(msg.channelId) as TextChannel;
        if (!channel) return;
        channel.messages.fetch(msg.messageId).then((m) => {
            m.delete().then(() => console.log(`Deleted message ${m.id}`));
        }).catch(() => {});

    });

    await Postgres.getRepository(Post).delete({
        id: postId
    });

    await Postgres.getRepository(PostMessage).delete({
        post: {
            id: postId
        }
    });

    return void interaction.reply(successEmbed(`Deleting all the posts on all the servers...!`));
    
}
