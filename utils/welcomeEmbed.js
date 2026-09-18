const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
                    ? `Verifikasi di <#${process.env.VERIFY_CHANNEL_EMBED_ID}> untuk mengakses server.`
                    : `Verify in <#${process.env.VERIFY_CHANNEL_EMBED_ID}> to access the server.`
            },
            {
                name: '📦 Free Scripts',
                value: isId
                    ? `Setelah verifikasi, ambil script gratis di <#${process.env.FREE_SCRIPTS_CHANNEL_ID}>.`
                    : `Once verified, grab free scripts in <#${process.env.FREE_SCRIPTS_CHANNEL_ID}>.`
            },
            {
                name: '💎 Premium',
                value: isId
                    ? `Mau premium? Buka ticket di <#${process.env.PREMIUM_TICKET_CHANNEL_ID}> atau kunjungi [syshub.site](https://syshub.site).`
                    : `Want premium? Open a ticket in <#${process.env.PREMIUM_TICKET_CHANNEL_ID}> or visit [syshub.site](https://syshub.site).`
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

module.exports = { getEmbed, getButtons };
