const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-joki',
    description: 'Send the Joki AFK Roblox Ticket Panel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permission to use this command!');
        }

        const channel = message.guild.channels.cache.get('1494149119256690698');
        if (!channel) return message.reply('Channel not found!');

        const embed = new EmbedBuilder()
            .setTitle('🤖 JOKI AFK ROBLOX')
            .setColor('#2F3136')
            .setDescription(
                'Pilih jenis joki yang kamu inginkan:\n\n' +
                '**🏃 TREADMILL ONLY**\n' +
                '> AFK treadmill untuk meningkatkan speed\n\n' +
                '**🥚 TREADMILL + STEAL EGG**\n' +
                '> AFK treadmill + Steal an Egg\n' +
                '> *bebas request egg yang ingin diambil*'
            )
            .addFields(
                {
                    name: '📌 INFORMATION',
                    value:
                        '• egg bebas request sesuai kebutuhan\n' +
                        '• semakin panjang durasi, semakin hemat harga per jam\n' +
                        '• durasi dihitung sejak akun mulai AFK\n' +
                        '• 24 jam = 1 hari\n' +
                        '• tersedia monitoring & reconnect'
                }
            )
            .setFooter({ text: 'SysHub Joki Service' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('joki_treadmill')
                    .setLabel('Treadmill Only')
                    .setEmoji('🏃')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('joki_treadmill_egg')
                    .setLabel('Treadmill + Steal Egg')
                    .setEmoji('🥚')
                    .setStyle(ButtonStyle.Success),
            );

        await channel.send({ embeds: [embed], components: [row] });
        await message.reply('Joki Panel has been sent!');
    },
};
