const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

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

        const embed = new EmbedBuilder()
            .setTitle('🔐 Verifikasi Akun')
            .setDescription('Klik tombol di bawah untuk memulai verifikasi.\nKamu akan mendapatkan captcha berupa 5 karakter (huruf/angka).\nMasukkan kode yang benar untuk mendapatkan akses server.')
            .setColor('#2F3136')
            .setFooter({ text: 'SysHub Verification' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_start')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await channel.send({ embeds: [embed], components: [row] });
        await message.reply(`Panel verifikasi berhasil dikirim ke <#${VERIFY_CHANNEL}>!`);
    },
};
