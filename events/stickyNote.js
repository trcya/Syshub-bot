const { Events, EmbedBuilder } = require('discord.js');

function getStickyEmbedId() {
    return new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('📌 Informasi Penting')
        .setDescription('Selamat datang di **SysHub**! Silakan akses channel di bawah ini:')
        .addFields(
            {
                name: '📖 Tutorial',
                value: '> Lihat panduan di <#1543492628866400358>'
            },
            {
                name: '📥 Get Free Script',
                value: '> Ambil script gratis di <#1494146608026353714>'
            },
            {
                name: '💎 Buy Premium',
                value: '> Beli premium di <#1494149019864137780> atau kunjungi [syshub.site](https://syshub.site)'
            }
        )
        .setTimestamp()
        .setFooter({ text: 'SysHub' });
}

function getStickyEmbedEn() {
    return new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('📌 Important Information')
        .setDescription('Welcome to **SysHub**! Please access the channels below:')
        .addFields(
            {
                name: '📖 Tutorial',
                value: '> Check the guide at <#1543492628866400358>'
            },
            {
                name: '📥 Get Free Script',
                value: '> Get free scripts at <#1494146608026353714>'
            },
            {
                name: '💎 Buy Premium',
                value: '> Buy premium at <#1494149019864137780> or visit [syshub.site](https://syshub.site)'
            }
        )
        .setTimestamp()
        .setFooter({ text: 'SysHub' });
}

const STICKY_CHANNELS = {
    '1494149400052633671': { lang: 'id' },
    '1494149497360617553': { lang: 'en' }
};

const lastStickyMessage = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        if (!STICKY_CHANNELS[message.channel.id]) return;

        try {
            const oldMsgId = lastStickyMessage.get(message.channel.id);
            if (oldMsgId) {
                const oldMsg = await message.channel.messages.fetch(oldMsgId).catch(() => null);
                if (oldMsg) await oldMsg.delete().catch(() => {});
            }

            const newMsg = await message.channel.send({ embeds: [sticky.lang === 'en' ? getStickyEmbedEn() : getStickyEmbedId()] });
            lastStickyMessage.set(message.channel.id, newMsg.id);
        } catch {}
    },
};
