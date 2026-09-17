const { EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

module.exports = {
    name: 'sendkey',
    description: 'Kirim pesan selamat menang giveaway dan key lisensi ke user via DM',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Anda tidak memiliki izin untuk menggunakan perintah ini.');
        }

        if (args.length < 2) {
            return message.reply('⚠️ **Penggunaan:** `!sendkey <@user|user_id> <key> [nama_hadiah]`');
        }

        const userArg = args[0];
        const key = args[1];
        const prize = args.slice(2).join(' ') || 'Key Giveaway SysHub';

        let targetUser = message.mentions.users.first();
        if (!targetUser) {
            try {
                const cleanId = userArg.replace(/[<@!>]/g, '');
                targetUser = await message.client.users.fetch(cleanId);
            } catch (err) {
                return message.reply('❌ User tidak ditemukan. Pastikan mention user atau sertakan User ID yang valid.');
            }
        }

        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });

        const dmEmbed = new EmbedBuilder()
            .setColor('#2F3136')
            .setAuthor({
                name: 'SysHub Giveaway',
                icon_url: 'attachment://logo.png'
            })
            .setTitle('🎉 Selamat! Anda Menang Giveaway!')
            .setDescription(`Halo **${targetUser.username}**! Selamat, Anda telah memenangkan giveaway **${prize}** di server kami. Berikut adalah key hadiah Anda:`)
            .addFields(
                { name: '🎁 Hadiah', value: `\`${prize}\``, inline: true },
                { name: '🔑 Key Anda', value: `\`\`\`${key}\`\`\``, inline: false },
                { name: '📌 Catatan', value: '• Simpan key ini baik-baik dan jangan bagikan ke siapapun.\n• Nikmati hadiah Anda dan terima kasih telah berpartisipasi!', inline: false }
            )
            .setThumbnail('attachment://logo.png')
            .setFooter({ text: 'SysHub Giveaway Team • Congratulations!', icon_url: 'attachment://logo.png' })
            .setTimestamp();

        try {
            await targetUser.send({ embeds: [dmEmbed], files: [logoFile] });

            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅ Key Giveaway Berhasil Dikirim!')
                .setDescription(`Pesan ucapan selamat menang giveaway dan key telah dikirimkan ke ${targetUser} (**${targetUser.tag}**) via Direct Message.`)
                .addFields(
                    { name: 'Pemenang', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Hadiah', value: `\`${prize}\``, inline: true },
                    { name: 'Key', value: `\`\`\`${key}\`\`\``, inline: false }
                )
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error(`Gagal mengirim DM ke user ${targetUser.id}:`, error);

            const failEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⚠️ Gagal Mengirim DM')
                .setDescription(`Bot tidak dapat mengirim pesan DM ke ${targetUser} (**${targetUser.tag}**). Kemungkinan DM user tersebut dikunci/diblokir.`)
                .addFields(
                    { name: 'Pemenang', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Key (Admin Copy)', value: `\`\`\`${key}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Silakan berikan key ini secara manual ke pemenang.' })
                .setTimestamp();

            await message.reply({ embeds: [failEmbed] });
        }
    },
};
