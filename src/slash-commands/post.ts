import { ActionRowBuilder, ApplicationCommandOptionType, ChannelType, EmbedBuilder, ModalBuilder, PermissionsBitField, TextChannel, TextInputBuilder, TextInputComponent, TextInputStyle } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'post',
        description: 'Create a new Tweet & Discord post'
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (!process.env.OWNER_IDS?.split(',').includes(interaction.user!.id)) {
        return void interaction.reply(`❌ | You can't run this command (insufficient permissions).`);
    }

    const modal = new ModalBuilder()
    .setTitle('New Project submission')
    .setCustomId('new_post_modal')

    const rows = [

        new TextInputBuilder()
            .setCustomId('project_name')
            .setLabel("Project Name")
            .setMinLength(2)
            .setMaxLength(15)
            .setRequired(true)
            .setPlaceholder('FOMO.tools')
            .setStyle(TextInputStyle.Short),
        
        new TextInputBuilder()
            .setCustomId('project_twitter_url')
            .setLabel("Project Twitter URL")
            .setMinLength(2)
            .setMaxLength(12 + 15)
            .setRequired(true)
            .setPlaceholder('twitter.com/fomotools')
            .setStyle(TextInputStyle.Short),

        new TextInputBuilder()
            .setCustomId('project_description')
            .setLabel("Project Description")
            .setMinLength(2)
            .setRequired(true)
            .setPlaceholder('All-in-one NFT data aggregator coming on #Solana to track your #NFT performance...')
            .setStyle(TextInputStyle.Paragraph),

        new TextInputBuilder()
            .setCustomId('project_image_url')
            .setLabel("Project Image URL")
            .setRequired(true)
            .setPlaceholder('https://cdn.discord.com/attachments/723456789/723456789/image.png')
            .setStyle(TextInputStyle.Short)

    ].map(
        (component) => new ActionRowBuilder().addComponents(component)
    ) as ActionRowBuilder<TextInputBuilder>[];

    modal.addComponents(...rows);
    interaction.showModal(modal);
    
}
