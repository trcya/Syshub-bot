const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildStatusBody, sendOrUpdateStatus } = require('../utils/statusBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executor-status')
        .setDescription('Send executor status to the designated channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await sendOrUpdateStatus(interaction.client);
        await interaction.reply({ content: 'Executor status updated!', ephemeral: true });
    },
};
