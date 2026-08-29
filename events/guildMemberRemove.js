const { Events, EmbedBuilder } = require('discord.js');
const { updateStats } = require('../utils/statsManager');

const recentlyProcessed = new Map();
const COOLDOWN_MS = 10000;

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const now = Date.now();
        const lastProcessed = recentlyProcessed.get(member.id);
        if (lastProcessed && now - lastProcessed < COOLDOWN_MS) return;
        recentlyProcessed.set(member.id, now);
        setTimeout(() => recentlyProcessed.delete(member.id), COOLDOWN_MS);

        updateStats(member.client);
        console.log(`Member left: ${member.user.tag} from guild: ${member.guild.id}`);

        if (member.guild.id !== process.env.GUILD_ID) {
            console.log(`Guild ID mismatch (Leave). Expected: ${process.env.GUILD_ID}, Got: ${member.guild.id}`);
            return;
        }

        const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!channel) {
            console.log(`Channel not found in cache (Leave): ${process.env.WELCOME_CHANNEL_ID}`);
            return;
        }

        const goodbyeEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('😢 Goodbye!')
            .setDescription(`**${member.user.tag}** has left the server.\nWe hope to see you again!`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Username', value: `${member.user.tag}`, inline: true },
                { name: '🆔 Member ID', value: `${member.id}`, inline: true },
            )
            .setFooter({ text: `Total Members: ${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        channel.send({ embeds: [goodbyeEmbed] });
    },
};
