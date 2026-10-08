const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

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
                    name: '🥚 JOKI BREAK & STEAL AN EGG',
                    value:
                        '```\n' +
                        '30 Menit  — Rp 15.000\n' +
                        '1 Jam     — Rp 25.000\n' +
                        '2 Jam     — Rp 40.000\n' +
                        '3 Jam     — Rp 55.000\n' +
                        '5 Jam     — Rp 80.000\n' +
                        '```\n' +
                        '• *Joki getok telur*\n' +
                        '• *Khusus break egg. Pet yang keluar diambil sendiri oleh buyer.*',
                    inline: false
                },
                {
                    name: '🥚 JOKI AFK BREAK & STEAL AN EGG',
                    value:
                        '```\n' +
                        '1 Hari    — Rp 60.000\n' +
                        '3 Hari    — Rp 165.000\n' +
                        '7 Hari    — Rp 350.000\n' +
                        '```\n' +
                        '• *Treadmill + Steal Pet 1–10B/s*',
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
            .setTitle('🎮 JOKI AFK ROBLOX & BREAK & STEAL AN EGG')
            .setColor('#2F3136')
            .setDescription(
                'Pilih jenis joki yang kamu inginkan melalui menu dropdown di bawah:\n\n' +
                '**🏃 TREADMILL ONLY**\n' +
                '> AFK treadmill untuk meningkatkan speed\n\n' +
                '**🥚 TREADMILL + STEAL EGG**\n' +
                '> AFK treadmill + Steal an Egg\n' +
                '> *bebas request egg yang ingin diambil*\n\n' +
                '**🥚 JOKI BREAK & STEAL AN EGG**\n' +
                '> Joki getok telur (khusus break egg, pet diambil sendiri oleh buyer)\n\n' +
                '**🥚 JOKI AFK BREAK & STEAL AN EGG**\n' +
                '> Treadmill + Steal Pet 1–10B/s\n\n' +
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

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('joki_select_service')
            .setPlaceholder('👇 Pilih jenis joki yang kamu inginkan...')
            .addOptions([
                {
                    label: 'Treadmill Only',
                    value: 'joki_treadmill',
                    description: 'AFK treadmill untuk meningkatkan speed',
                    emoji: '🏃',
                },
                {
                    label: 'Treadmill + Steal Egg',
                    value: 'joki_treadmill_egg',
                    description: 'AFK treadmill + Steal an Egg',
                    emoji: '🥚',
                },
                {
                    label: 'Joki Break & Steal an Egg',
                    value: 'joki_break_egg',
                    description: 'Joki getok telur (khusus break egg, pet diambil buyer)',
                    emoji: '🥚',
                },
                {
                    label: 'Joki AFK Break & Steal an Egg',
                    value: 'joki_afk_break_egg',
                    description: 'Treadmill + Steal Pet 1–10B/s',
                    emoji: '🥚',
                },
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await pricelistChannel.send({ embeds: [pricelistEmbed] });
        await orderChannel.send({ embeds: [orderEmbed], components: [row] });
        await message.reply('Pricelist & Order Panel has been sent!');
    },
};
