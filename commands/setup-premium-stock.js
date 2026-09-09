const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '..', 'premium-stock.json');
const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

function loadStock() {
    try {
        return JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
    } catch {
        return { defaultStock: 5, currentStock: 5, channelId: '1494149019864137780', messageId: null };
    }
}

function saveStock(data) {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2));
}

function buildStockEmbed(stockData) {
    const { currentStock, defaultStock } = stockData;
    const barEmpty = '⬛';
    const barFilled = '🟩';
    const maxBar = 10;
    const filled = Math.min(currentStock, maxBar);
    const bar = barFilled.repeat(filled) + barEmpty.repeat(maxBar - filled);

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🔐 Premium Key Lifetime Stock')
        .setDescription(
            `**Current Stock:** \`${currentStock}\` keys\n` +
            `**Default Stock:** \`${defaultStock}\` keys/month\n\n` +
            `${bar}\n\n` +
            `Beli premium key di **syshub.site** atau buka ticket di server.`
        )
        .setFooter({ text: 'SysHub Premium System' })
        .setTimestamp();
}

function buildAdminRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('premium_stock_add')
                .setLabel('Add')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('premium_stock_delete')
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖'),
            new ButtonBuilder()
                .setCustomId('premium_stock_reset')
                .setLabel('Reset')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId('premium_stock_default')
                .setLabel('Default')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🏠'),
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-premium-stock')
        .setDescription('Deploy the Premium Key Stock Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetChannelId = '1494149019864137780';
        let channel;
        try {
            channel = await interaction.client.channels.fetch(targetChannelId);
        } catch {
            channel = null;
        }

        if (!channel) {
            return interaction.editReply({ content: 'Channel premium stock tidak ditemukan!' });
        }

        const stockData = loadStock();
        const embed = buildStockEmbed(stockData);
        const adminRow = buildAdminRow();
        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });

        const msg = await channel.send({ embeds: [embed], components: [adminRow], files: [logoFile] });

        stockData.channelId = channel.id;
        stockData.messageId = msg.id;
        saveStock(stockData);

        await interaction.editReply({ content: `Premium Stock Panel deployed to ${channel}!` });
    },
    buildStockEmbed,
    buildAdminRow,
    loadStock,
    saveStock,
};
