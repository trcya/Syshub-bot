const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const TARGET_CHANNEL_ID = '1547633306005274755';

const COUNTRIES = [
    { id: 'id', label: 'Indonesia', roleId: '1547633283662086231', emoji: '🇮🇩' },
    { id: 'ph', label: 'Philippines', roleId: '1547633286551965776', emoji: '🇵🇭' },
    { id: 'us', label: 'United States', roleId: '1547633298241626143', emoji: '🇺🇸' },
    { id: 'my', label: 'Malaysia', roleId: '1547633299864952883', emoji: '🇲🇾' },
    { id: 'vn', label: 'Vietnam', roleId: '1547633302025015426', emoji: '🇻🇳' },
];

function buildEmbed() {
    const roleList = COUNTRIES.map(c => `${c.emoji} <@&${c.roleId}> — **${c.label}**`).join('\n');

    return new EmbedBuilder()
        .setTitle('🌍 Country Roles Selection')
        .setColor('#00bfff')
        .setDescription(
            `Halo member **SysHub | Newest Best Exploits!**\n\n` +
            `Silakan pilih role negara asal atau bahasa yang kamu gunakan dengan mengklik tombol di bawah ini.\n` +
            `Tombol berfungsi sebagai **toggle** (klik sekali untuk mengambil role, klik lagi untuk melepas role).\n\n` +
            `**Daftar Role Negara:**\n${roleList}\n\n` +
            `Negaramu belum ada di daftar? Kamu bisa tetap ngobrol di channel <#1547633306005274755> / <#other-country-chat> atau <#international-chat>!`
        )
        .setFooter({ text: 'SysHub | Newest Best Exploits • Auto Role System' })
        .setTimestamp();
}

function buildButtons() {
    return new ActionRowBuilder().addComponents(
        COUNTRIES.map(c =>
            new ButtonBuilder()
                .setCustomId(`country_role_${c.id}`)
                .setLabel(c.label)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(c.emoji)
        )
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-country-roles')
        .setDescription('Send the country role selection panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.guild.channels.cache.get(TARGET_CHANNEL_ID);
        if (!channel) {
            return interaction.reply({ content: 'Channel not found!', ephemeral: true });
        }

        const embed = buildEmbed();
        const row = buildButtons();

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Country roles panel sent to <#${TARGET_CHANNEL_ID}>!`, ephemeral: true });
    },
    buildEmbed,
    buildButtons,
    COUNTRIES,
};
