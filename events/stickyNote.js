const { Events } = require('discord.js');

const STICKY_CHANNELS = {
    '1494149400052633671': {
        content: '📖 Tutorial <#1543492628866400358>\n📥 Get Free Script <#1494146608026353714>\n💎 Buy Premium <#1494149019864137780>'
    },
    '1494149497360617553': {
        content: '📖 Tutorial <#1543492628866400358>\n📥 Get Free Script <#1494146608026353714>\n💎 Buy Premium <#1494149019864137780>'
    }
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

            const newMsg = await message.channel.send({ content: sticky.content });
            lastStickyMessage.set(message.channel.id, newMsg.id);
        } catch {}
    },
};
