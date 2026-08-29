const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executor-status')
        .setDescription('Send executor status to the designated channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.client.channels.cache.get(process.env.EXECUTOR_STATUS_CHANNEL_ID);
        if (!channel) return interaction.reply({ content: 'Channel not found! Make sure `EXECUTOR_STATUS_CHANNEL_ID` is set in .env', ephemeral: true });

        const green = '🟢';
        const yellow = '🟡';
        const red = '🔴';

        const body = {
            flags: 32768,
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: '# Executor Status'
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: '**Free PC Executors:**'
                        },
                        {
                            type: 10,
                            content: `> [Velocity](https://realvelocity.xyz/): ${yellow}\n> [Madium](https://getmadium.net/): ${green}\n> [Real](https://realest.gg): ${green}`
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: '**Paid PC Executors:**'
                        },
                        {
                            type: 10,
                            content: `> [Volt](https://voltbz.net): ${yellow}\n> [Potassium](https://potassium.pro): ${green}\n> [Cosmic](https://cosmic.best/): ${yellow}\n> [Synapse Z](https://z.synapse.do/): ${yellow}\n> [Seliware](https://seliware.com): ${yellow}`
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: '**Android Executors:**'
                        },
                        {
                            type: 10,
                            content: `> [Arceus X](https://spdmteam.com/index?os=android): ${yellow}\n> [Codex](https://codex.lol/android): ${yellow}\n> [Delta](https://deltaexploits.dev/delta-executor-android): ${green}\n> [Vega X](https://vegax.gg): ${yellow}`
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: '**iOS Executors:**'
                        },
                        {
                            type: 10,
                            content: `> [Delta](https://deltaexploits.dev/delta-executor-ios): ${yellow}`
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: '**MacOS Executors:**'
                        },
                        {
                            type: 10,
                            content: `> [Macsploit](https://www.raptor.fun/) - PAID: ${yellow}\n> [Opiumware](https://use.opiumware.today/) - FREE: ${yellow}`
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: `-# ${green} Working · ${yellow} Untested · ${red} Not available for this script`
                        }
                    ]
                }
            ]
        };

        const res = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${interaction.client.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('Discord API Error:', err);
            return interaction.reply({ content: `Failed to send status: ${err.message}`, ephemeral: true });
        }

        await interaction.reply({ content: `Executor status sent to ${channel}`, ephemeral: true });
    },
};
