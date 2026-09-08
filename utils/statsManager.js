const { ChannelType, PermissionFlagsBits } = require('discord.js');

let updateTimeout = null;
let isUpdating = false;

const runUpdate = async (client) => {
    if (isUpdating) return;
    isUpdating = true;

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        isUpdating = false;
        return;
    }

    try {
        // 1. Get or Create Category
        let category = guild.channels.cache.find(c => c.name === '| SERVER STATS |' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: '| SERVER STATS |',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.Connect], // Disable connect for everyone
                    },
                ],
            });
        }

        // Fetch all members and channels to ensure caches are fully accurate
        await Promise.all([
            guild.members.fetch(),
            guild.channels.fetch(),
        ]);

        // Stats Data
        const allMembersCount = guild.memberCount.toLocaleString();
        const channelsCount = guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildText ||
            c.type === ChannelType.GuildVoice ||
            c.type === ChannelType.GuildAnnouncement ||
            c.type === ChannelType.GuildStageVoice ||
            c.type === ChannelType.GuildForum ||
            c.type === ChannelType.GuildMedia
        ).size.toLocaleString();
        const premiumRole = guild.roles.cache.get(process.env.PREMIUM_ROLE_ID);
        const premiumCount = premiumRole ? premiumRole.members.size.toLocaleString() : '0';

        const stats = [
            { name: `All Members: ${allMembersCount}`, pattern: 'All Members:' },
            { name: `Channels: ${channelsCount}`, pattern: 'Channels:' },
            { name: `Premium Users: ${premiumCount}`, pattern: 'Premium Users:' },
        ];

        for (const stat of stats) {
            let channel = guild.channels.cache.find(c => 
                c.parentId === category.id && 
                c.name.startsWith(stat.pattern) && 
                c.type === ChannelType.GuildVoice
            );

            if (!channel) {
                await guild.channels.create({
                    name: stat.name,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect],
                        },
                    ],
                });
            } else if (channel.name !== stat.name) {
                await channel.setName(stat.name);
            }
        }

        console.log('Server stats updated and channels ensured.');
    } catch (error) {
        console.error('Error updating server stats:', error);
    } finally {
        isUpdating = false;
    }
};

const updateStats = async (client, force = false) => {
    if (force) {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
        }
        await runUpdate(client);
        return;
    }

    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(async () => {
        updateTimeout = null;
        await runUpdate(client);
    }, 5000); // 5 seconds debounce for responsive real-time updates
};

module.exports = { updateStats };
