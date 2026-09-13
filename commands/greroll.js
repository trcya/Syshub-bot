const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('Reroll a giveaway winner')
        .addStringOption(option => option.setName('message_id').setDescription('The ID of the giveaway message').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) return interaction.reply({ content: 'Could not find the giveaway reaction! Make sure the message has a 🎉 reaction.', ephemeral: true });

            const users = await reaction.users.fetch();
            const entries = users.filter(u => !u.bot).map(u => u.id);

            if (entries.length === 0) return interaction.reply({ content: 'No valid entries found for this giveaway!', ephemeral: true });

            const winner = `<@${entries[Math.floor(Math.random() * entries.length)]}>`;
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY REROLL 🎉')
                .setColor('#57F287')
                .setDescription(`New winner: ${winner}\nTotal entries: **${entries.length}**`)
                .setTimestamp();

            interaction.reply({ content: `Congratulations ${winner}!`, embeds: [embed] });
        } catch (error) {
            console.error('[GREROLL] Error:', error.message);
            interaction.reply({ content: 'Invalid message ID or message not found in this channel.', ephemeral: true });
        }
    },
};
