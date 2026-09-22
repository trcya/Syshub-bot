const { Events } = require('discord.js');
const { updateStats } = require('../utils/statsManager');
const { sendOrUpdateStatus } = require('../utils/statusBuilder');
const { sendOrUpdateGameStatus } = require('../utils/gameStatusBuilder');
const { initStickyNotes } = require('./stickyNote');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Siap! Login sebagai ${client.user.tag}`);

        await sendOrUpdateStatus(client);
        await sendOrUpdateGameStatus(client);
        await updateStats(client, true);
        setInterval(() => { updateStats(client); }, 10 * 60 * 1000);

        await initStickyNotes(client);
    },
};
