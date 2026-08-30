const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const { updateStats } = require('../utils/statsManager');

const recentlyProcessed = new Map();
const COOLDOWN_MS = 10000;

function getEmbed(lang) {
    const isId = lang === 'id';
    return new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('👋 Welcome to SysHub!')
        .setDescription(isId
            ? 'Terima kasih sudah join! Berikut yang perlu kamu ketahui:'
            : 'Thanks for joining! Here is what you need to know:')
        .setImage('attachment://syshub.jpg')
        .addFields(
            {
                name: '✅ Verify',
                value: isId
                    ? 'Verifikasi di <#1504478063386165392> untuk mengakses server.'
                    : 'Verify in <#1504478063386165392> to access the server.'
            },
            {
                name: '📦 Free Scripts',
                value: isId
                    ? 'Setelah verifikasi, ambil script gratis di <#1494146608026353714>.'
                    : 'Once verified, grab free scripts in <#1494146608026353714>.'
            },
            {
                name: '💎 Premium',
                value: isId
                    ? 'Mau premium? Buka ticket di <#1494149019864137780> atau kunjungi [syshub.site](https://syshub.site).'
                    : 'Want premium? Open a ticket in <#1494149019864137780> or visit [syshub.site](https://syshub.site).'
            }
        )
        .setTimestamp()
        .setFooter({ text: 'SysHub' });
}

function getButtons(currentLang) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lang_id')
            .setLabel('🇮🇩 Indonesia')
            .setStyle(currentLang === 'id' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lang_en')
            .setLabel('🇬🇧 English')
            .setStyle(currentLang === 'en' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
}

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
            const dm = await member.send({
                files: [
                    {
                        attachment: path.join(__dirname, '..', 'syshub.jpg'),
                        name: 'syshub.jpg'
                    }
                ],
                embeds: [getEmbed('id')],
                components: [getButtons('id')]
            });

            const collector = dm.createMessageComponentCollector({ time: 300000 });

            collector.on('collect', async (i) => {
                const lang = i.customId === 'lang_id' ? 'id' : 'en';
                await i.update({
                    embeds: [getEmbed(lang)],
                    components: [getButtons(lang)]
                });
            });

            collector.on('end', async () => {
                try {
                    await dm.edit({ components: [] });
                } catch {}
            });
        } catch {
            console.log(`Could not DM ${member.user.tag} (DMs might be disabled).`);
        }
    },
};
