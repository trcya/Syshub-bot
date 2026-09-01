const { Events, EmbedBuilder } = require('discord.js');
const { updateStats } = require('../utils/statsManager');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (newMember.guild.id !== process.env.GUILD_ID) return;

        // Check if roles have changed
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        if (oldRoles.size !== newRoles.size || !oldRoles.equals(newRoles)) {
            updateStats(newMember.client);
        }

        // Check if member just boosted the server
        if (!oldMember.premiumSince && newMember.premiumSince) {
            const channel = newMember.guild.channels.cache.get('1494152927797973113');
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#F47FFF')
                    .setTitle('🚀 Server Boost!')
                    .setDescription(`Terima kasih <@${newMember.id}> sudah boost server ini!`)
                    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '👤 User', value: `${newMember.user.tag}`, inline: true },
                        { name: '🆔 ID', value: `${newMember.id}`, inline: true },
                        { name: '📊 Total Boosts', value: `${newMember.guild.premiumSubscriptionCount || 0}`, inline: true }
                    )
                    .setFooter({ text: 'Thank you for boosting!' })
                    .setTimestamp();

                channel.send({ embeds: [embed] });
            }
        }
    },
};
