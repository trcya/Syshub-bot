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

        // === PANEL 1: TREADMILL ONLY ===
        const embed1 = new EmbedBuilder()
            .setTitle('🤖 JOKI AFK ROBLOX')
            .setColor('#5865F2')
            .setDescription(
                '**🏃 TREADMILL ONLY**\n' +
                '> AFK treadmill untuk meningkatkan speed\n\n' +
                'Pilih durasi yang kamu inginkan:'
            )
            .addFields(
                {
                    name: '📌 INFORMATION',
                    value:
                        '• semakin panjang durasi, semakin hemat harga per jam\n' +
                        '• durasi dihitung sejak akun mulai AFK\n' +
                        '• 24 jam = 1 hari\n' +
                        '• tersedia monitoring & reconnect'
                }
            )
            .setFooter({ text: 'SysHub Joki Service' })
            .setTimestamp();

        const tRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_t1j').setLabel('1 Jam — 2K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t3j').setLabel('3 Jam — 5K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t6j').setLabel('6 Jam — 10K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t12j').setLabel('12 Jam — 18K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t1h').setLabel('1 Hari — 30K').setStyle(ButtonStyle.Primary),
        );
        const tRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_t2h').setLabel('2 Hari — 55K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t3h').setLabel('3 Hari — 75K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t5h').setLabel('5 Hari — 115K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t7h').setLabel('7 Hari — 150K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t14h').setLabel('14 Hari — 280K').setStyle(ButtonStyle.Primary),
        );
        const tRow3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_t21h').setLabel('21 Hari — 390K').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('joki_btn_t30h').setLabel('30 Hari — 500K').setStyle(ButtonStyle.Primary),
        );

        await channel.send({ embeds: [embed1], components: [tRow1, tRow2, tRow3] });

        // === PANEL 2: TREADMILL + STEAL EGG ===
        const embed2 = new EmbedBuilder()
            .setTitle('🥚 JOKI AFK ROBLOX')
            .setColor('#57F287')
            .setDescription(
                '**🥚 TREADMILL + STEAL EGG**\n' +
                '> AFK treadmill + Steal an Egg\n' +
                '> *bebas request egg yang ingin diambil*\n\n' +
                'Pilih durasi yang kamu inginkan:'
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

        const eRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_e1j').setLabel('1 Jam — 5K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e3j').setLabel('3 Jam — 14K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e6j').setLabel('6 Jam — 25K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e12j').setLabel('12 Jam — 45K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e1h').setLabel('1 Hari — 80K').setStyle(ButtonStyle.Success),
        );
        const eRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_e2h').setLabel('2 Hari — 150K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e3h').setLabel('3 Hari — 220K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e5h').setLabel('5 Hari — 330K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e7h').setLabel('7 Hari — 450K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e14h').setLabel('14 Hari — 850K').setStyle(ButtonStyle.Success),
        );
        const eRow3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('joki_btn_e21h').setLabel('21 Hari — 1.150K').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('joki_btn_e30h').setLabel('30 Hari — 1.500K').setStyle(ButtonStyle.Success),
        );

        await channel.send({ embeds: [embed2], components: [eRow1, eRow2, eRow3] });

        await message.reply('Joki Panel has been sent!');
    },
};
