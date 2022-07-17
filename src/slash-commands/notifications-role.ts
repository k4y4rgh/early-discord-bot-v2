import { ApplicationCommandOptionType, ChannelType, PermissionsBitField, TextChannel } from "discord.js";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'notifications-role',
        description: 'Choose the notification role',
        options: [
            {
                name: "role",
                description: "The role to send notifications to",
                type: ApplicationCommandOptionType.Role,
                required: true
            }
        ]
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (!interaction.memberPermissions!.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply(errorEmbed('You do not have permission to manage this server'));
    }

    const role = interaction.options.get('role')?.role!;
    
    const currentGuildConfiguration = await Postgres.getRepository(GuildConfiguration).findOne({
        where: {
            guildId: interaction.guildId!
        }
    });

    if (currentGuildConfiguration) {
        currentGuildConfiguration.roleId = role.id;
        await Postgres.getRepository(GuildConfiguration).save(currentGuildConfiguration);
    } else {
        await Postgres.getRepository(GuildConfiguration).insert({
            guildId: interaction.guildId!,
            channelId: role.id
        });
    }

    return void interaction.reply(successEmbed(`EarlyLink selections will now ping <@${role.id}>`));
    
}
