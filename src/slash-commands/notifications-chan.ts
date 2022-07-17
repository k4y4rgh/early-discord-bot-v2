import { ApplicationCommandOptionType, ChannelType, PermissionsBitField, TextChannel } from "discord.js";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'notifications-chan',
        description: 'Choose the notification channel',
        options: [
            {
                name: "channel",
                description: "The channel to send notifications to",
                type: ApplicationCommandOptionType.Channel,
                channel_types: [ChannelType.GuildText],
                required: true
            }
        ]
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (!interaction.memberPermissions!.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply(errorEmbed('You do not have permission to manage this server'));
    }

    const channel = interaction.options.get('channel')?.channel! as TextChannel;
    const member = channel.guild.members.cache.get(interaction.client.user!.id)!;
    if (!channel.permissionsFor(member.id)?.has(PermissionsBitField.Flags.SendMessages)) {
        return void interaction.reply(`❌ | I can't send messages in this channel.`);
    }
    
    const currentGuildConfiguration = await Postgres.getRepository(GuildConfiguration).findOne({
        where: {
            guildId: interaction.guildId!
        }
    });

    if (currentGuildConfiguration) {
        currentGuildConfiguration.channelId = channel.id;
        await Postgres.getRepository(GuildConfiguration).save(currentGuildConfiguration);
    } else {
        await Postgres.getRepository(GuildConfiguration).insert({
            guildId: interaction.guildId!,
            channelId: channel.id
        });
    }

    return void interaction.reply(successEmbed(`EarlyLink selections will now be sent to <#${channel.id}>`));
    
}
