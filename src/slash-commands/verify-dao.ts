import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, PermissionsBitField, TextChannel } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'verify-dao',
        description: 'Verify a DAO server to enable votes',
        options: [
            {
                name: 'dao-server-id',
                description: 'The ID of the DAO server',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            }
        ]
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (interaction.user.id !== process.env.OWNER_ID) {
        return void interaction.reply(errorEmbed(`You can't run this command (insufficient permissions).`));
    }

    const daoServerId = interaction.options.get('dao-server-id')?.value! as string;

    const daoServer = await Postgres.getRepository(GuildConfiguration).findOne({
        where: {
            guildId: daoServerId
        }
    });

    if (!daoServer) {
        await Postgres.getRepository(GuildConfiguration).insert({
            guildId: daoServerId,
            isVerifiedDAO: true
        });
    } else {
        daoServer.isVerifiedDAO = true;
        await Postgres.getRepository(GuildConfiguration).save(daoServer);
    }

    const guildData = interaction.client.guilds.cache.get(daoServerId)!;

    return void interaction.reply(successEmbed(`DAO server ${guildData.name} (${guildData.memberCount} members) has been verified.`));
    
}
