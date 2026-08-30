const fs = require('fs');
const path = require('path');

const MSG_ID_FILE = path.join(__dirname, '..', 'executor_status_msg_id.txt');

function getSavedMessageId() {
    try {
        if (fs.existsSync(MSG_ID_FILE)) {
            return fs.readFileSync(MSG_ID_FILE, 'utf-8').trim();
        }
    } catch {}
    return null;
}

function saveMessageId(id) {
    fs.writeFileSync(MSG_ID_FILE, id, 'utf-8');
}

function buildStatusBody() {
    const green = '🟢';
    const yellow = '🟡';
    const red = '🔴';

    const now = new Date();
    const timestamp = `<t:${Math.floor(now.getTime() / 1000)}:R>`;

    return {
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
                        content: `> [Velocity](https://realvelocity.xyz/): ${green}\n> [Madium](https://getmadium.net/): ${green}\n> [Real](https://realest.gg): ${green}`
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
                    },
                    {
                        type: 10,
                        content: `-# Last updated: ${timestamp}`
                    }
                ]
            }
        ]
    };
}

async function sendOrUpdateStatus(client) {
    const channelId = process.env.EXECUTOR_STATUS_CHANNEL_ID;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    const body = buildStatusBody();
    const savedMsgId = getSavedMessageId();
    const baseUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;

    if (savedMsgId) {
        const res = await fetch(`${baseUrl}/${savedMsgId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bot ${client.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            console.log('Executor status message updated.');
            return;
        }

        console.log('Old message not found, sending new one...');
    }

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${client.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        const msg = await res.json();
        saveMessageId(msg.id);
        console.log('Executor status message sent.');
    } else {
        const err = await res.json();
        console.error('Failed to send executor status:', err);
    }
}

module.exports = { buildStatusBody, sendOrUpdateStatus, getSavedMessageId, saveMessageId };
