import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, PermissionsBitField, TextChannel } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'unverify-dao',
        description: 'Unverify a DAO server to enable votes',
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

    if (!process.env.OWNER_IDS?.split(',').includes(interaction.user!.id)) {
        return void interaction.reply(errorEmbed(`You can't run this command (insufficient permissions).`));
    }

    const daoServerId = interaction.options.get('dao-server-id')?.value! as string;

    const daoServer = await Postgres.getRepository(GuildConfiguration).findOne({
        where: {
            guildId: daoServerId
        }
    });

    if (daoServer) {
        daoServer.isVerifiedDAO = false;
        await Postgres.getRepository(GuildConfiguration).save(daoServer);
    }

    const guildData = interaction.client.guilds.cache.get(daoServerId)!;

    return void interaction.reply(successEmbed(`DAO server ${guildData.name} (${guildData.memberCount} members) has been unverified.`));
    
}
