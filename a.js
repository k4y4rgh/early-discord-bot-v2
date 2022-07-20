const a = require('./a.json');

let query = `
    insert into guild_configuration
    ("guildId", "channelId", "roleId", "isVerifiedDAO")
    values
`;

const entries = Object.entries(a);
const values = []

for (let entry of entries) {
    const guildId = entry[0].split('_')[0];
    const propertyName = entry[0].split('_')[1];
    const idx = values.findIndex((v) => v.guildId === guildId);
    if (idx > -1) {
        values[idx][propertyName] = entry[1];
    } else {
        values.push({
            guildId,
            [propertyName]: entry[1]
        });
    }
}

console.log(values);

values.forEach((value) => {
    query += `('${value.guildId}',' ${value.channelId}', ${value.roleId ? `'${value.roleId}'` : 'null'}, false),\n`;
})

require('fs').writeFileSync('./query.txt', query);