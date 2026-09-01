const fs = require('fs');
const path = require('path');

const MSG_ID_FILE = path.join(__dirname, '..', 'game_status_msg_id.txt');
const GAME_STATUS_FILE = path.join(__dirname, '..', 'game-status.json');
const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

const GAME_STATUS_CHANNEL_ID = '1494147077746331718';

const STATUS_ICONS = {
    ready: '🟢',
    waiting: '🟡',
    outdate: '🔴',
    discontinue: '🔴'
};

function getSavedMessageId() {
    try {
        if (fs.existsSync(MSG_ID_FILE)) {
            return fs.readFileSync(MSG_ID_FILE, 'utf-8').trim();
        }
    } catch { }
    return null;
}

function saveMessageId(id) {
    fs.writeFileSync(MSG_ID_FILE, id, 'utf-8');
}

function readGameStatus() {
    try {
        if (!fs.existsSync(GAME_STATUS_FILE)) {
            fs.writeFileSync(GAME_STATUS_FILE, JSON.stringify({ games: [] }, null, 2));
        }
        return JSON.parse(fs.readFileSync(GAME_STATUS_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading game-status.json:', e);
        return { games: [] };
    }
}

function buildGameStatusEmbed() {
    const data = readGameStatus();
    const now = new Date();

    let gameList = '';
    data.games.forEach((game, i) => {
        const icon = STATUS_ICONS[game.status] || '⚪';
        const note = game.note ? ` (${game.note})` : '';
        gameList += `${i + 1}. **${game.name}**${note} : ${icon}\n`;
    });

    return {
        color: 0x2F3136,
        author: {
            name: 'SysHub Game Status',
            icon_url: 'attachment://logo.png'
        },
        description: 'Welcome to the official **SysHub Game Status** center. Below is the operational status of all games.',
        thumbnail: {
            url: 'attachment://logo.png'
        },
        fields: [
            {
                name: 'STATUS LEGEND',
                value: `${STATUS_ICONS.ready} : Ready to Use\n${STATUS_ICONS.waiting} : Waiting Update\n${STATUS_ICONS.outdate} : Outdate`
            },
            {
                name: '\u200b',
                value: '---'
            },
            {
                name: 'LIST GAME',
                value: gameList || 'No games configured.'
            }
        ],
        footer: {
            text: 'SysHub Status System',
            icon_url: 'attachment://logo.png'
        },
        timestamp: now.toISOString()
    };
}

async function sendOrUpdateGameStatus(client) {
    const channel = client.channels.cache.get(GAME_STATUS_CHANNEL_ID);
    if (!channel) {
        console.error('[GAME STATUS] Channel not found:', GAME_STATUS_CHANNEL_ID);
        return;
    }

    const embed = buildGameStatusEmbed();
    const savedMsgId = getSavedMessageId();
    const baseUrl = `https://discord.com/api/v10/channels/${GAME_STATUS_CHANNEL_ID}/messages`;

    const logoBuffer = fs.readFileSync(LOGO_PATH);

    if (savedMsgId) {
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
        formData.append('files[0]', new Blob([logoBuffer], { type: 'image/png' }), 'logo.png');

        const res = await fetch(`${baseUrl}/${savedMsgId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bot ${client.token}`
            },
            body: formData
        });

        if (res.ok) {
            console.log('[GAME STATUS] Message updated.');
            return;
        }

        console.log('[GAME STATUS] Old message not found, sending new one...');
    }

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
    formData.append('files[0]', new Blob([logoBuffer], { type: 'image/png' }), 'logo.png');

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${client.token}`
        },
        body: formData
    });

    if (res.ok) {
        const msg = await res.json();
        saveMessageId(msg.id);
        console.log('[GAME STATUS] Message sent.');
    } else {
        const err = await res.json();
        console.error('[GAME STATUS] Failed to send:', err);
    }
}

module.exports = { buildGameStatusEmbed, sendOrUpdateGameStatus, readGameStatus, getSavedMessageId, saveMessageId };
