const { Events } = require('discord.js');

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

const STICKY_CHANNELS = {
    '1494149400052633671': { lang: 'id' },
    '1494149497360617553': { lang: 'en' }
};

const lastStickyMessage = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const sticky = STICKY_CHANNELS[message.channel.id];
        if (!sticky) return;

        try {
            const oldMsgId = lastStickyMessage.get(message.channel.id);
            if (oldMsgId) {
                const oldMsg = await message.channel.messages.fetch(oldMsgId).catch(() => null);
                if (oldMsg) await oldMsg.delete().catch(() => {});
            }

            const newMsg = await message.channel.send({ content: sticky.lang === 'en' ? getStickyTextEn() : getStickyTextId() });
            lastStickyMessage.set(message.channel.id, newMsg.id);
        } catch {}
    },
};
