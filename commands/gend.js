const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gend')
        .setDescription('Manually end a giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');

        await interaction.deferReply({ ephemeral: true });

        try {
            const fetchedMessage = await interaction.channel.messages.fetch(messageId);

            const reaction = fetchedMessage.reactions.cache.get('🎉');
            if (!reaction) {
                return interaction.editReply('Could not find the 🎉 reaction on this message.');
            }

            const users = await reaction.users.fetch();
            const entries = users.filter(u => !u.bot).map(u => u.id);

            if (entries.length === 0) {
                return interaction.editReply('No one entered this giveaway.');
            }

            const winnerCount = Math.min(1, entries.length);
            const shuffled = [...entries];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            const winners = [];
            for (let i = 0; i < winnerCount; i++) {
                winners.push(`<@${shuffled[i]}>`);
            }

            const prize = fetchedMessage.embeds[0]?.description?.match(/Prize: \*\*(.+?)\*\*/)?.[1] || 'Unknown';

            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY ENDED 🎉')
                .setColor('#FEE75C')
                .setDescription(`Prize: **${prize}**\nWinners: ${winners.join(', ')}\nEntries: **${entries.length}**`)
                .setTimestamp();

            await interaction.channel.send({
                content: `Congratulations ${winners.join(', ')}! You won **${prize}**!`,
                embeds: [winEmbed],
            });

            return interaction.editReply(`Giveaway ended! Winner: ${winners.join(', ')}`);
        } catch (error) {
            console.error('[GEND] Error:', error.message);
            return interaction.editReply('Failed to fetch message. Make sure the message ID is correct and the message is in this channel.');
        }
    },
};
