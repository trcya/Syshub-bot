const { Events, EmbedBuilder } = require('discord.js');
const { updateStats } = require('../utils/statsManager');

const recentlyProcessed = new Map();
const COOLDOWN_MS = 10000;

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const now = Date.now();
        const lastProcessed = recentlyProcessed.get(member.id);
        if (lastProcessed && now - lastProcessed < COOLDOWN_MS) return;
        recentlyProcessed.set(member.id, now);
        setTimeout(() => recentlyProcessed.delete(member.id), COOLDOWN_MS);

        updateStats(member.client);
        console.log(`New member detected: ${member.user.tag} in guild: ${member.guild.id}`);
        
        if (member.guild.id !== process.env.GUILD_ID) {
            console.log(`Guild ID mismatch. Expected: ${process.env.GUILD_ID}, Got: ${member.guild.id}`);
            return;
        }

        const channel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
        if (!channel) {
            console.log(`Channel not found in cache: ${process.env.WELCOME_CHANNEL_ID}`);
            return;
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('👋 Welcome to the Server!')
            .setDescription(`Welcome <@${member.id}> to **${member.guild.name}**!\nWe are glad to have you here.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Username', value: `${member.user.tag}`, inline: true },
                { name: '🆔 Member ID', value: `${member.id}`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false },
            )
            .setFooter({ text: `Total Members: ${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        channel.send({ content: `Hey <@${member.id}>, welcome!`, embeds: [welcomeEmbed] });

        try {
            await member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#2F3136')
                        .setTitle('👋 Welcome to SysHub!')
                        .setDescription('Terima kasih sudah join! Berikut yang perlu kamu ketahui:\nThanks for joining! Here is what you need to know:')
                        .addFields(
                            {
                                name: '✅ Verify',
                                value: `> 🇮🇩 Verifikasi di <#1504478063386165392> untuk mengakses server.\n> 🇬🇧 Verify in <#1504478063386165392> to access the server.`
                            },
                            {
                                name: '📦 Free Scripts',
                                value: `> 🇮🇩 Setelah verifikasi, ambil script gratis di <#1494146608026353714>.\n> 🇬🇧 Once verified, grab free scripts in <#1494146608026353714>.`
                            },
                            {
                                name: '💎 Premium',
                                value: `> 🇮🇩 Mau premium? Buka ticket di <#1494149019864137780> atau kunjungi [syshub.site](https://syshub.site).\n> 🇬🇧 Want premium? Open a ticket in <#1494149019864137780> or visit [syshub.site](https://syshub.site).`
                            }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'SysHub' })
                ]
            });
        } catch {
            console.log(`Could not DM ${member.user.tag} (DMs might be disabled).`);
        }
    },
};
