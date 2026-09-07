const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'payqris',
    description: 'Tampilkan QRIS pembayaran',
    execute(message, args) {
        const imagePath = path.join(__dirname, '..', 'image.png');
        const attachment = new AttachmentBuilder(imagePath, { name: 'qris.png' });

        const embed = new EmbedBuilder()
            .setTitle('Pembayaran QRIS')
            .setDescription('Scan QRIS di bawah untuk melakukan pembayaran.')
            .setColor('#FF0000')
            .setImage('attachment://qris.png')
            .setFooter({ text: 'SysHub Bot - Advanced Edition' })
            .setTimestamp();

        message.reply({ embeds: [embed], files: [attachment] });
    },
};
