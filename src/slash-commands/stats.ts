import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, PermissionsBitField, TextChannel } from "discord.js";
import { IsNull, Not } from "typeorm";
import { GuildConfiguration, Postgres } from "../database";
import { SlashCommandRunFunction } from "../handlers/commands";
import { errorEmbed, successEmbed } from "../util";

export const commands = [
    {
        name: 'stats',
        description: 'Gets the bot statistics'
    }
];

export const run: SlashCommandRunFunction = async (interaction) => {

    if (interaction.user.id !== process.env.OWNER_ID) {
        return void interaction.reply(`❌ | You can't run this command (insufficient permissions).`);
    }
    
    // post to hastebin
    fetch(`https://hastebin.androz2091.fr/documents`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: interaction.client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).map(guild => `${guild.name} - ${guild.memberCount}`).join('\n')
    }).then(res => res.json()).then(async (json) => {
        console.log(json)
        const serverCount = interaction.client.guilds.cache.size;
        
        const configurations = await Postgres.getRepository(GuildConfiguration).find({
            where: {
                channelId: Not(IsNull())
            }
        });

        const statsEmbed = new EmbedBuilder()
            .setColor(process.env.EMBED_COLOR)
            .setTitle('Statistics 📊')
            .addFields([
                { name: 'Servers', value: serverCount.toString() + ' servers are currently using the bot' },
                { name: 'Subscriptions', value: configurations.length.toString() + ' servers configured a notifications channel' },
                { name: 'Server list', value: `[Click here](https://hastebin.androz2091.fr/${json.key})` }
            ]);
        return void interaction.reply({
            embeds: [statsEmbed]
        });
    });
    
}
