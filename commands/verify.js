const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { generateCaptcha, generateCaptchaImage } = require('../utils/captcha');

const VERIFY_CHANNEL = '1546462500273262663';
const VERIFY_ROLE = '1494143210157510666';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Kirim panel verifikasi ke channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = await interaction.guild.channels.fetch(VERIFY_CHANNEL);
        if (!channel) {
            return interaction.reply({ content: 'Channel verifikasi tidak ditemukan!', ephemeral: true });
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
        return interaction.reply({ content: `Panel verifikasi berhasil dikirim ke <#${VERIFY_CHANNEL}>!`, ephemeral: true });
    },
};
