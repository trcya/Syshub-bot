const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const fs = require('fs');
const path = require('path');

const GIVEAWAY_FILE = path.join(__dirname, '..', 'giveaways.json');

function loadGiveaways() {
    try {
        if (fs.existsSync(GIVEAWAY_FILE)) {
            return JSON.parse(fs.readFileSync(GIVEAWAY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[GIVEAWAY] Failed to load giveaways:', e.message);
    }
    return [];
}

function saveGiveaways(giveaways) {
    try {
        fs.writeFileSync(GIVEAWAY_FILE, JSON.stringify(giveaways, null, 2));
    } catch (e) {
        console.error('[GIVEAWAY] Failed to save giveaways:', e.message);
    }
}

function removeGiveaway(messageId) {
    const giveaways = loadGiveaways().filter(g => g.messageId !== messageId);
    saveGiveaways(giveaways);
}

async function endGiveaway(client, giveaway) {
    const { channelId, messageId, prize, winnerCount, guildId } = giveaway;

    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.error(`[GIVEAWAY] Guild ${guildId} not found for giveaway ${messageId}`);
            removeGiveaway(messageId);
            return;
        }

        const channel = await guild.channels.fetch(channelId);
        if (!channel) {
            console.error(`[GIVEAWAY] Channel ${channelId} not found for giveaway ${messageId}`);
            removeGiveaway(messageId);
            return;
        }

        const fetchedMessage = await channel.messages.fetch(messageId).catch(() => null);
        if (!fetchedMessage) {
            console.error(`[GIVEAWAY] Message ${messageId} not found`);
            removeGiveaway(messageId);
            return;
        }

        const reaction = fetchedMessage.reactions.cache.get('🎉');
        if (!reaction) {
            await channel.send(`Giveaway for **${prize}** ended but no reaction found. No winners.`);
            removeGiveaway(messageId);
            return;
        }

        const users = await reaction.users.fetch();
        const entries = users.filter(u => !u.bot).map(u => u.id);

        if (entries.length === 0) {
            await channel.send(`No one entered the giveaway for **${prize}**.`);
            removeGiveaway(messageId);
            return;
        }

        const winners = [];
        const shuffled = [...entries];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        for (let i = 0; i < Math.min(winnerCount, shuffled.length); i++) {
            winners.push(`<@${shuffled[i]}>`);
        }

        const winEmbed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY ENDED 🎉')
            .setColor('#FEE75C')
            .setDescription(`Prize: **${prize}**\nWinners: ${winners.join(', ')}\nEntries: **${entries.length}**`)
            .setTimestamp();

        await channel.send({
            content: `Congratulations ${winners.join(', ')}! You won **${prize}**!`,
            embeds: [winEmbed],
        });

        removeGiveaway(messageId);
    } catch (error) {
        console.error(`[GIVEAWAY] Error ending giveaway ${messageId}:`, error);
    }
}

function scheduleGiveaway(client, giveaway) {
    const remaining = giveaway.endAt - Date.now();
    if (remaining <= 0) {
        endGiveaway(client, giveaway);
    } else {
        setTimeout(() => endGiveaway(client, giveaway), remaining);
    }
}

module.exports = { loadGiveaways, scheduleGiveaway, endGiveaway };

module.exports.data = new SlashCommandBuilder()
    .setName('gstart')
    .setDescription('Start a giveaway')
    .addStringOption(option => option.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('How long? (e.g. 10m, 1h, 1d)').setRequired(true))
    .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

module.exports.execute = async (interaction) => {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners');

    const msDuration = ms(duration);
    if (!msDuration) return interaction.reply({ content: 'Invalid duration format!', ephemeral: true });

    const endTimestamp = Date.now() + msDuration;

    const embed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY STARTED 🎉')
        .setColor('#5865F2')
        .setDescription(`Prize: **${prize}**\nHosted by: ${interaction.user}\nWinners: **${winnerCount}**\nEnds: <t:${Math.floor(endTimestamp / 1000)}:R>`)
        .setTimestamp(endTimestamp);

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    await message.react('🎉');

    const giveaway = {
        messageId: message.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        prize,
        winnerCount,
        endAt: endTimestamp,
        hostedBy: interaction.user.id,
    };

    const giveaways = loadGiveaways();
    giveaways.push(giveaway);
    saveGiveaways(giveaways);

    scheduleGiveaway(interaction.client, giveaway);
};
