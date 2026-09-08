const { PermissionFlagsBits, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');

const VERIFY_CHANNEL = '1546462500273262663';

module.exports = {
    name: 'verify',
    description: 'Kirim panel verifikasi ke channel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Kamu tidak punya izin untuk menggunakan command ini!');
        }

        const channel = await message.guild.channels.fetch(VERIFY_CHANNEL);
        if (!channel) {
            return message.reply('Channel verifikasi tidak ditemukan!');
        }

        const logoPath = path.join(__dirname, '..', 'logo.png');
        const logoAttachment = new AttachmentBuilder(logoPath, { name: 'logo.png' });

        const embed = new EmbedBuilder()
            .setTitle('Verify yourself')
            .setDescription('Click the button below and solve the short captcha to unlock the server.')
            .setColor('#00bfff')
            .setThumbnail('attachment://logo.png')
            .setFooter({ text: 'SysHub Verification' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_start')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
            );

        await channel.send({ embeds: [embed], components: [row], files: [logoAttachment] });
        await message.reply(`Panel verifikasi berhasil dikirim ke <#${VERIFY_CHANNEL}>!`);
    },
};
