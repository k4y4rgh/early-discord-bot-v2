import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, EmbedData, PermissionsBitField, TextChannel } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Post, Postgres, PostMessage } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'edit-post',
        description: 'Edits a post on Discord and on the website',
        options: [
            {
                name: 'post-id',
                description: 'The ID of the post',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            },
            {
                name: 'new-image',
                description: 'The new image url for the post',
                type: ApplicationCommandOptionType.String,
                required: false
            },
            {
                name: 'new-content',
                description: 'The new description for the post',
                type: ApplicationCommandOptionType.String,
                required: false
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

    const newImage = interaction.options.get('new-image')?.value as string;
    const newContent = interaction.options.get('new-content')?.value as string;

    if (!newImage && !newContent) {
        return void interaction.reply(errorEmbed(`You must specify either a new image or new content.`));
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
            const embed = new EmbedBuilder(m.embeds[0] as EmbedData);
            if (newImage) embed.setImage(newImage);
            if (newContent) embed.setDescription(newContent);
            m.edit({
                embeds: [embed]
            }).then(() => console.log(`Edited message ${m.id}`));
        }).catch(() => {});

    });

    await Postgres.getRepository(Post).update({
        id: postId
    }, {
        projectImageUrl: newImage || postData.projectImageUrl,
        projectDescription: newContent || postData.projectDescription
    });

    return void interaction.reply(successEmbed(`Updating all the posts on all the servers...!`));
    
}
