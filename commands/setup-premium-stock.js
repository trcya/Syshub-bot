const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '..', 'premium-stock.json');
const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

function loadStock() {
    try {
        return JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
    } catch {
        return { defaultStock: 5, currentStock: 5, channelId: '1494149019864137780', messageId: null, adminChannelId: '1514177930903687330', adminMessageId: null };
    }
}

function saveStock(data) {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2));
}

function buildStockEmbed(stockData) {
    const { currentStock } = stockData;

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🔐 Premium Key Lifetime Stock')
        .setThumbnail('attachment://logo.png')
        .setDescription(
            `**Current Stock:** \`${currentStock}\` keys\n\n` +
            `Beli premium key di **syshub.site** atau buka ticket di server.`
        )
        .setFooter({ text: 'SysHub Premium System' })
        .setTimestamp();
}

function buildAdminEmbed(stockData) {
    const { currentStock, defaultStock } = stockData;

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚙️ Premium Stock Admin Panel')
        .setThumbnail('attachment://logo.png')
        .setDescription(
            `**Current Stock:** \`${currentStock}\` keys\n` +
            `**Default Stock:** \`${defaultStock}\` keys/month`
        )
        .setFooter({ text: 'SysHub Admin Panel' })
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

async function updateBothPanels(client) {
    const stockData = loadStock();
    const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
    const stockEmbed = buildStockEmbed(stockData);
    const adminEmbed = buildAdminEmbed(stockData);
    const adminRow = buildAdminRow();

    if (stockData.channelId && stockData.messageId) {
        try {
            const ch = await client.channels.fetch(stockData.channelId);
            if (ch) {
                const msg = await ch.messages.fetch(stockData.messageId);
                await msg.edit({ embeds: [stockEmbed], files: [logoFile] });
            }
        } catch (e) {}
    }

    if (stockData.adminChannelId && stockData.adminMessageId) {
        try {
            const ch = await client.channels.fetch(stockData.adminChannelId);
            if (ch) {
                const msg = await ch.messages.fetch(stockData.adminMessageId);
                const adminLogo = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
                await msg.edit({ embeds: [adminEmbed], components: [adminRow], files: [adminLogo] });
            }
        } catch (e) {}
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-premium-stock')
        .setDescription('Deploy the Premium Key Stock Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const stockChannelId = '1494149019864137780';
        const adminChannelId = '1514177930903687330';

        let stockChannel, adminChannel;
        try {
            stockChannel = await interaction.client.channels.fetch(stockChannelId);
        } catch { stockChannel = null; }
        try {
            adminChannel = await interaction.client.channels.fetch(adminChannelId);
        } catch { adminChannel = null; }

        if (!stockChannel) {
            return interaction.editReply({ content: 'Channel stock tidak ditemukan!' });
        }
        if (!adminChannel) {
            return interaction.editReply({ content: 'Channel admin tidak ditemukan!' });
        }

        const stockData = loadStock();
        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });

        const stockEmbed = buildStockEmbed(stockData);
        const stockMsg = await stockChannel.send({ embeds: [stockEmbed], files: [logoFile] });

        const adminEmbed = buildAdminEmbed(stockData);
        const adminRow = buildAdminRow();
        const adminLogo = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
        const adminMsg = await adminChannel.send({ embeds: [adminEmbed], components: [adminRow], files: [adminLogo] });

        stockData.channelId = stockChannel.id;
        stockData.messageId = stockMsg.id;
        stockData.adminChannelId = adminChannel.id;
        stockData.adminMessageId = adminMsg.id;
        saveStock(stockData);

        await interaction.editReply({ content: `✅ Stock panel deployed to ${stockChannel}\n✅ Admin panel deployed to ${adminChannel}` });
    },
    buildStockEmbed,
    buildAdminEmbed,
    buildAdminRow,
    loadStock,
    saveStock,
    updateBothPanels,
};
