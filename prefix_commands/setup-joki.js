const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-joki',
    description: 'Send the Joki Pricelist & Order Panel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permission to use this command!');
        }

        const pricelistChannel = message.guild.channels.cache.get('1546531103324643338');
        if (!pricelistChannel) return message.reply('Pricelist channel not found!');

        const orderChannel = message.guild.channels.cache.get('1494149119256690698');
        if (!orderChannel) return message.reply('Order channel not found!');

        const pricelistEmbed = new EmbedBuilder()
            .setTitle('💰 PRICELIST JOKI')
            .setColor('#FFD700')
            .setDescription('Semua harga joki yang tersedia:')
            .addFields(
                {
                    name: '🏃 TREADMILL ONLY',
                    value:
                        '```\n' +
                        '6 Jam     — Rp 7.000\n' +
                        '12 Jam    — Rp 10.000\n' +
                        '1 Hari    — Rp 15.000\n' +
                        '2 Hari    — Rp 25.000\n' +
                        '3 Hari    — Rp 35.000\n' +
                        '5 Hari    — Rp 50.000\n' +
                        '7 Hari    — Rp 65.000\n' +
                        '14 Hari   — Rp 120.000\n' +
                        '21 Hari   — Rp 170.000\n' +
                        '30 Hari   — Rp 220.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🥚 TREADMILL + STEAL EGG',
                    value:
                        '```\n' +
                        '6 Jam     — Rp 14.000\n' +
                        '12 Jam    — Rp 22.000\n' +
                        '1 Hari    — Rp 35.000\n' +
                        '2 Hari    — Rp 60.000\n' +
                        '3 Hari    — Rp 85.000\n' +
                        '5 Hari    — Rp 130.000\n' +
                        '7 Hari    — Rp 170.000\n' +
                        '14 Hari   — Rp 300.000\n' +
                        '21 Hari   — Rp 400.000\n' +
                        '30 Hari   — Rp 500.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🔄 REBIRTH (Grow a Chicken Fighter)',
                    value:
                        '```\n' +
                        '1 Rebirth   — Rp 1.000\n' +
                        '10 Rebirth  — Rp 9.000\n' +
                        '50 Rebirth  — Rp 40.000\n' +
                        '100 Rebirth — Rp 80.000\n' +
                        '```',
                    inline: false
                },
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

        const orderEmbed = new EmbedBuilder()
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
                '> Joki rebirth sesuai jumlah yang diinginkan\n\n' +
                `> 📋 Lihat pricelist lengkap di <#${pricelistChannel.id}>`
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
                new ButtonBuilder()
                    .setCustomId('joki_rebirth')
                    .setLabel('Rebirth')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
            );

        await pricelistChannel.send({ embeds: [pricelistEmbed] });
        await orderChannel.send({ embeds: [orderEmbed], components: [row] });
        await message.reply('Pricelist & Order Panel has been sent!');
    },
};
