const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-hiring')
        .setDescription('Send the Hiring Ticket Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.guild.channels.cache.get('1549563222082850847');
        if (!channel) return interaction.reply({ content: 'Hiring channel not found!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🚨 WE\'RE HIRING: STREAMER & CREATOR')
            .setColor('#FF0000')
            .setDescription('Syshub is looking for Streamers & Content Creators to join our team!')
            .addFields(
                {
                    name: '🎥 STREAMER',
                    value: [
                        '> • aktif livestream',
                        '> • nyaman berinteraksi dengan audience',
                        '> • bersedia memperkenalkan dan mempromosikan Syshub',
                    ].join('\n')
                },
                {
                    name: '🎬 CREATOR',
                    value: [
                        '> • mampu membuat konten seputar Roblox / Syshub',
                        '> • kreatif dan konsisten',
                        '> • bisa membuat showcase, review, tutorial, atau konten lainnya',
                    ].join('\n')
                },
                {
                    name: '✨ BENEFITS',
                    value: [
                        '> 🔑 Premium Key selama menjadi Streamer / Creator Syshub',
                        '> 🧪 Beta Tester Access untuk mencoba fitur/script terbaru lebih awal',
                        '> 💰 Performance-based Salary, semakin baik performa dan kontribusi, semakin besar potensi penghasilan',
                        '> 🤝 kesempatan untuk berkembang dan berkolaborasi bersama Syshub',
                    ].join('\n')
                }
            )
            .setFooter({ text: 'SysHub Hiring System' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hiring_streamer')
                    .setLabel('🎥 STREAMER')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hiring_creator')
                    .setLabel('🎬 CREATOR')
                    .setStyle(ButtonStyle.Success),
            );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Hiring Panel has been sent!', ephemeral: true });
    },
};
