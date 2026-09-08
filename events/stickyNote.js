const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');

function getStickyTextId() {
    return `# 📌 Informasi Penting
Selamat datang di **SysHub**! Silakan akses channel di bawah ini:

# 📖 Tutorial
> Lihat panduan di <#1543492628866400358>

# 📥 Get Free Script
> Ambil script gratis di <#1494146608026353714>

# 💎 Buy Premium
> Beli premium di <#1494149019864137780> atau kunjungi [syshub.site](https://syshub.site)`;
}

function getStickyTextEn() {
    return `# 📌 Important Information
Welcome to **SysHub**! Please access the channels below:

# 📖 Tutorial
> Check the guide at <#1543492628866400358>

# 📥 Get Free Script
> Get free scripts at <#1494146608026353714>

# 💎 Buy Premium
> Buy premium at <#1494149019864137780> or visit [syshub.site](https://syshub.site)`;
}

function getStickyVerifyEmbed() {
    const logoPath = path.join(__dirname, '..', 'logo.png');
    const logoAttachment = new AttachmentBuilder(logoPath, { name: 'logo.png' });

    const embed = new EmbedBuilder()
        .setTitle('Verify yourself')
        .setDescription('Click the button below and solve the short captcha to unlock the server.')
        .setColor('#00bfff')
        .setThumbnail('attachment://logo.png')
        .setFooter({ text: 'SysHub Verification' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_start')
                .setLabel('Verify')
                .setStyle(ButtonStyle.Success)
        );

    return { embeds: [embed], components: [row], files: [logoAttachment] };
}

const STICKY_CHANNELS = {
    '1494149400052633671': { lang: 'id' },
    '1494149497360617553': { lang: 'en' },
    '1546462500273262663': { lang: 'verify' }
};

const lastStickyMessage = new Map();
const processing = new Set();

async function initStickyNotes(client) {
    for (const [channelId, config] of Object.entries(STICKY_CHANNELS)) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) continue;

            const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
            if (!messages) continue;

            const lastBotMsg = messages.find(m => m.author.id === client.user.id);
            if (lastBotMsg) {
                lastStickyMessage.set(channelId, lastBotMsg.id);
                console.log(`[StickyNote] Loaded existing sticky in ${channelId}: ${lastBotMsg.id}`);
            }
        } catch (err) {
            console.error(`[StickyNote] Failed init channel ${channelId}:`, err.message);
        }
    }
}

module.exports = {
    name: Events.MessageCreate,
    initStickyNotes,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const sticky = STICKY_CHANNELS[message.channel.id];
        if (!sticky) return;

        if (processing.has(message.channel.id)) return;
        processing.add(message.channel.id);

        try {
            const oldMsgId = lastStickyMessage.get(message.channel.id);
            if (oldMsgId) {
                const oldMsg = await message.channel.messages.fetch(oldMsgId).catch(() => null);
                if (oldMsg && oldMsg.author.id === message.client.user.id) {
                    await oldMsg.delete().catch(() => {});
                }
            }

            let payload;
            if (sticky.lang === 'verify') {
                payload = getStickyVerifyEmbed();
            } else if (sticky.lang === 'en') {
                payload = { content: getStickyTextEn() };
            } else {
                payload = { content: getStickyTextId() };
            }

            const newMsg = await message.channel.send(payload);
            lastStickyMessage.set(message.channel.id, newMsg.id);
        } catch (error) {
            console.error(`[StickyNote] Error in channel ${message.channel.id}:`, error.message);
        } finally {
            processing.delete(message.channel.id);
        }
    },
};
