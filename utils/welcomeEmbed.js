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

module.exports = { getEmbed, getButtons };
