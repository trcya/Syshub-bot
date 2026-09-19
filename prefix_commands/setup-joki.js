const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'setup-joki',
    description: 'Send the Joki Pricelist & Order Panel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permission to use this command!');
        }

        const pricelistChannel = message.guild.channels.cache.get(process.env.JOKI_PRICELIST_CHANNEL_ID);
        if (!pricelistChannel) return message.reply('Pricelist channel not found!');

        const orderChannel = message.guild.channels.cache.get(process.env.JOKI_ORDER_CHANNEL_ID);
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
                        '6 Jam     — Rp 5.000\n' +
                        '12 Jam    — Rp 8.000\n' +
                        '1 Hari    — Rp 12.000\n' +
                        '2 Hari    — Rp 20.000\n' +
                        '3 Hari    — Rp 30.000\n' +
                        '5 Hari    — Rp 42.000\n' +
                        '7 Hari    — Rp 55.000\n' +
                        '14 Hari   — Rp 100.000\n' +
                        '21 Hari   — Rp 140.000\n' +
                        '30 Hari   — Rp 180.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🥚 TREADMILL + STEAL EGG',
                    value:
                        '```\n' +
                        '6 Jam     — Rp 10.000\n' +
                        '12 Jam    — Rp 16.000\n' +
                        '1 Hari    — Rp 25.000\n' +
                        '2 Hari    — Rp 45.000\n' +
                        '3 Hari    — Rp 65.000\n' +
                        '5 Hari    — Rp 95.000\n' +
                        '7 Hari    — Rp 125.000\n' +
                        '14 Hari   — Rp 220.000\n' +
                        '21 Hari   — Rp 300.000\n' +
                        '30 Hari   — Rp 375.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🔒 PRIVATE SERVER RENTAL',
                    value:
                        '```\n' +
                        '3 Jam     — Rp 5.000\n' +
                        '6 Jam     — Rp 9.000\n' +
                        '12 Jam    — Rp 15.000\n' +
                        '1 Hari    — Rp 25.000\n' +
                        '3 Hari    — Rp 60.000\n' +
                        '7 Hari    — Rp 120.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🔄 REBIRTH (Grow a Chicken Fighter)',
                    value:
                        '```\n' +
                        '1 Rebirth   — Rp 1.000\n' +
                        '50 Rebirth  — Rp 30.000\n' +
                        '100 Rebirth — Rp 45.000\n' +
                        '500 Rebirth — Rp 200.000\n' +
                        '```',
                    inline: false
                },
                {
                    name: '🎮 MAIN AKUN / AFK (Grow a Chicken Fighter)',
                    value:
                        '```\n' +
                        '1 Jam    — Rp 20.000\n' +
                        '5 Jam    — Rp 80.000\n' +
                        '10 Jam   — Rp 150.000\n' +
                        '```\n' +
                        '✅ Auto Rebirth\n' +
                        '✅ Auto UFO (bebas request ayam yang mau di naikin)\n' +
                        '✅ Auto Event (kalo ada event khusus)',
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
                '**🔒 PRIVATE SERVER RENTAL**\n' +
                '> Sewa private server untuk AFK\n\n' +
                '**🔄 REBIRTH (Grow a Chicken Fighter)**\n' +
                '> Joki rebirth sesuai jumlah yang diinginkan\n\n' +
                '**🎮 MAIN AKUN (Grow a Chicken Fighter)**\n' +
                '> Mainin akun bebas request\n\n' +
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
                    .setCustomId('joki_private_server')
                    .setLabel('Private Server')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('joki_rebirth')
                    .setLabel('Rebirth')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('joki_main_akun')
                    .setLabel('Main Akun')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Danger),
            );

        await pricelistChannel.send({ embeds: [pricelistEmbed] });
        await orderChannel.send({ embeds: [orderEmbed], components: [row] });
        await message.reply('Pricelist & Order Panel has been sent!');
    },
};
