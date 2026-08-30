const { Events } = require('discord.js');
const { updateStats } = require('../utils/statsManager');
const { sendOrUpdateStatus } = require('../utils/statusBuilder');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        await sendOrUpdateStatus(client);

        await updateStats(client, true);

        setInterval(() => {
            updateStats(client);
        }, 10 * 60 * 1000);
    },
};
