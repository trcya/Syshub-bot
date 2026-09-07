const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-joki',
    description: 'Send the Joki AFK Roblox & Grow a Chicken Fighter Ticket Panel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permission to use this command!');
        }

        const channel = message.guild.channels.cache.get('1494149119256690698');
        if (!channel) return message.reply('Channel not found!');

        const embed = new EmbedBuilder()
            .setTitle('🎮 JOKI AFK ROBLOX & GROW A CHICKEN FIGHTER')
            .setColor('#2F3136')
            .setDescription(
                'Pilih jenis joki yang kamu inginkan:\n\n' +
                '**🏃 TREADMILL ONLY**\n' +
                '> AFK treadmill untuk meningkatkan speed\n\n' +
                '**🥚 TREADMILL + STEAL EGG**\n' +
                '> AFK treadmill + Steal an Egg\n' +
                '> *bebas request egg yang ingin diambil*\n\n' +
                '**🔄 REBIRTH (Grow a Chicken Fighter)**\n' +
                '> Joki rebirth sesuai jumlah yang diinginkan'
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
                },
                {
                    name: '💰 PRICELIST REBIRTH',
                    value:
                        '```\n' +
                        '1 Rebirth    — Rp 1.000\n' +
                        '10 Rebirth   — Rp 9.000\n' +
                        '50 Rebirth   — Rp 40.000\n' +
                        '100 Rebirth  — Rp 80.000\n' +
                        '```'
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
                new ButtonBuilder()
                    .setCustomId('joki_rebirth')
                    .setLabel('Rebirth')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
            );

        await channel.send({ embeds: [embed], components: [row] });
        await message.reply('Joki Panel has been sent!');
    },
};
