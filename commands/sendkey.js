const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sendkey')
        .setDescription('Kirim pesan selamat dan key lisensi ke user via Direct Message (DM)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User atau User ID yang menerima key')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('key')
                .setDescription('Key / Lisensi yang ingin dikirim')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('script')
                .setDescription('Nama Script / Produk (opsional, contoh: TereHub VIP)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Durasi Key (opsional, contoh: Lifetime / 30 Hari)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const key = interaction.options.getString('key');
        const scriptName = interaction.options.getString('script') || 'SysHub Script VIP';
        const duration = interaction.options.getString('duration') || 'Lifetime';

        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });

        const dmEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setAuthor({
                name: 'SysHub Official',
                icon_url: 'attachment://logo.png'
            })
            .setTitle(`🎉 Selamat! Key ${scriptName} Anda Telah Siap`)
            .setDescription(`Halo **${targetUser.username}**! Selamat, pesanan/transaksi Anda telah berhasil diproses. Berikut adalah informasi lisensi key milik Anda:`)
            .addFields(
                { name: '📦 Produk', value: `\`${scriptName}\``, inline: true },
                { name: '⏳ Durasi', value: `\`${duration}\``, inline: true },
                { name: '🔑 License Key', value: `\`\`\`${key}\`\`\``, inline: false },
                { name: '📌 Catatan', value: '• Simpan key ini baik-baik dan jangan bagikan ke siapapun.\n• Gunakan key pada loader/script yang ditentukan.', inline: false }
            )
            .setThumbnail('attachment://logo.png')
            .setFooter({ text: 'SysHub System • Terima kasih atas dukungannya!', icon_url: 'attachment://logo.png' })
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed], files: [logoFile] });

            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Key Berhasil Dikirim!')
                .setDescription(`Pesan ucapan selamat dan key telah dikirimkan ke ${targetUser} (**${targetUser.tag}**) via Direct Message.`)
                .addFields(
                    { name: 'Penerima', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Produk', value: `\`${scriptName}\``, inline: true },
                    { name: 'Key', value: `\`\`\`${key}\`\`\``, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error) {
            console.error(`Gagal mengirim DM ke user ${targetUser.id}:`, error);

            const failEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⚠️ Gagal Mengirim DM')
                .setDescription(`Bot tidak dapat mengirim pesan DM ke ${targetUser} (**${targetUser.tag}**). Kemungkinan DM user tersebut dikunci/diblokir.`)
                .addFields(
                    { name: 'Penerima', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Key (Admin Copy)', value: `\`\`\`${key}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Silakan berikan key ini secara manual ke user.' })
                .setTimestamp();

            await interaction.reply({ embeds: [failEmbed], ephemeral: true });
        }
    },
};
