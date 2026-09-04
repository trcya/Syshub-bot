const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-midman')
        .setDescription('Send the Midman Ticket Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.guild.channels.cache.get(process.env.MIDMAN_CHANNEL_ID);
        if (!channel) return interaction.reply({ content: 'Midman channel not found!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ MIDMAN SYSHUB')
            .setColor('#2F3136')
            .setDescription('> khusus transaksi uang asli (IDR)')
            .addFields(
                {
                    name: '💰 FEE',
                    value: [
                        '> 1K–99K — **2K**',
                        '> 100K–199K — **5K**',
                        '> 200K–299K — **10K**',
                        '> 400K–599K — **15K**',
                        '> 600K–899K — **20K**',
                        '> 800K–1JT — **25K**',
                        '> 1JT+ — **5%** dari total transaksi',
                    ].join('\n')
                },
                {
                    name: '⚠️ RULES',
                    value: [
                        '> • tidak menerima midman akun',
                        '> • transaksi wajib melalui ticket resmi Syshub',
                        '> • fee dibayar sebelum transaksi',
                    ].join('\n')
                }
            )
            .setFooter({ text: 'SysHub Middleman System' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_midman_ticket')
                    .setLabel('Open Midman Ticket')
                    .setEmoji('🤝')
                    .setStyle(ButtonStyle.Primary),
            );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Midman Panel has been sent!', ephemeral: true });
    },
};
