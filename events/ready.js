const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateStats } = require('../utils/statsManager');
const { sendOrUpdateStatus } = require('../utils/statusBuilder');
const { sendOrUpdateGameStatus } = require('../utils/gameStatusBuilder');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'live-monitor.json');

const CHANNEL_CONTENT = '1494148923013595156';
const CHANNEL_LIVE = '1494148813441732750';

let TikTokLiveConnection = null;
try {
    TikTokLiveConnection = require('tiktok-live-connector').TikTokLiveConnection;
    console.log('[MONITOR] tiktok-live-connector loaded');
} catch (e) {
    console.warn('[MONITOR] tiktok-live-connector not available:', e.message);
}

const tiktokConnections = new Map();
const ytChannelIdCache = new Map();

function readDb() {
    try {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '[]');
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('[MONITOR] Error readDb:', e);
        return [];
    }
}

function writeDb(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[MONITOR] Error writeDb:', e);
    }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, opts = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

function getTiktokConnection(username) {
    if (tiktokConnections.has(username)) {
        return tiktokConnections.get(username);
    }
    if (!TikTokLiveConnection) return null;
    const conn = new TikTokLiveConnection(username, { processInitialData: false, enableExtendedGiftInfo: false });
    tiktokConnections.set(username, conn);
    return conn;
}

// ============ YOUTUBE ============

async function resolveYoutubeChannelId(handle) {
    if (ytChannelIdCache.has(handle)) return ytChannelIdCache.get(handle);
    try {
        const res = await fetchWithTimeout(`https://www.youtube.com/${handle}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) return null;
        const html = await res.text();
        const match = html.match(/"externalId"\s*:\s*"(UC[^"]+)"/)
            || html.match(/"channelId"\s*:\s*"(UC[^"]+)"/)
            || html.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[^"]+)"/);
        const id = match ? match[1] : null;
        if (id) {
            ytChannelIdCache.set(handle, id);
            console.log(`[YT] Resolved ${handle} -> ${id}`);
        }
        return id;
    } catch (e) {
        console.error(`[YT] Failed resolve channel ID ${handle}:`, e.message);
        return null;
    }
}

async function checkYoutubeLive(handle) {
    try {
        const res = await fetchWithTimeout(`https://www.youtube.com/${handle}/live`, { headers: { 'User-Agent': UA } }, 20000);
        if (!res.ok) {
            console.log(`[YT LIVE] ${handle}: HTTP ${res.status}`);
            return { isLive: false };
        }

        const html = await res.text();
        let videoId = null;

        // Strategy 1: canonical link redirect
        const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
        const canonical = canonicalMatch ? canonicalMatch[1] : '';
        if (canonical.includes('/watch')) {
            const vMatch = canonical.match(/v=([^&]+)/);
            videoId = vMatch ? vMatch[1] : null;
        }

        // Strategy 2: videoId + live indicator in page data
        if (!videoId) {
            const vidMatch = html.match(/"videoId"\s*:\s*"([^"]{11})"/);
            const hasLiveIndicator = html.includes('"isLive":true')
                || html.includes('"isLiveContent":true')
                || html.includes('"style":"LIVE"')
                || html.includes('liveStreamability')
                || html.includes('"isLiveBroadcast":true')
                || html.includes('LIVE_STREAM_IN_PROGRESS');
            if (vidMatch && hasLiveIndicator) {
                videoId = vidMatch[1];
            }
        }

        // Strategy 3: ytInitialPlayerResponse
        if (!videoId) {
            const playerResp = html.match(/var ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});\s*var/);
            if (playerResp) {
                try {
                    const pr = JSON.parse(playerResp[1]);
                    const ps = pr?.playabilityStatus;
                    if (ps?.liveStreamability || ps?.status === 'LIVE_STREAM_IN_PROGRESS') {
                        videoId = pr?.videoDetails?.videoId;
                    }
                } catch (_) {}
            }
        }

        // Strategy 4: og:video meta tag
        if (!videoId) {
            const ogVideo = html.match(/<meta property="og:video" content="https:\/\/www\.youtube\.com\/embed\/([^"?]+)/);
            if (ogVideo) videoId = ogVideo[1];
        }

        if (!videoId) {
            console.log(`[YT LIVE] ${handle}: not live`);
            return { isLive: false };
        }

        let title = 'Siaran Langsung YouTube';
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/) || html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch) title = titleMatch[1];

        let channelName = handle;
        const channelNameMatch = html.match(/<link itemprop="name" content="([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/);
        if (channelNameMatch) channelName = channelNameMatch[1];

        const avatarMatch = html.match(/(https:\/\/yt3\.ggpht\.com\/[^\s"'\=\?]+)/);

        console.log(`[YT LIVE] ${handle}: LIVE! videoId=${videoId}`);

        return {
            isLive: true,
            videoId,
            title,
            channelName,
            avatarUrl: avatarMatch ? avatarMatch[1] : null,
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            streamUrl: `https://www.youtube.com/watch?v=${videoId}`
        };
    } catch (e) {
        console.error(`[YT LIVE ERROR] ${handle}:`, e.message);
        return { isLive: false, error: true };
    }
}

async function checkYoutubeContent(handle, contentType) {
    try {
        const channelId = await resolveYoutubeChannelId(handle);
        if (!channelId) {
            console.error(`[YT CONTENT] ${handle}: channel ID not resolved`);
            return { isLive: false, error: true };
        }

        const res = await fetchWithTimeout(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) {
            console.error(`[YT CONTENT] ${handle}: RSS HTTP ${res.status}`);
            return { isLive: false, error: true };
        }

        const xml = await res.text();
        const entries = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        while ((match = entryRegex.exec(xml)) !== null) {
            const entry = match[1];
            const vid = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
            const title = entry.match(/<media:title[^>]*>([^<]+)<\/media:title>/)?.[1]
                || entry.match(/<title>([^<]+)<\/title>/)?.[1];
            if (vid) entries.push({ videoId: vid, title });
        }

        if (entries.length === 0) {
            console.log(`[YT CONTENT] ${handle}: no entries in RSS`);
            return { isLive: false };
        }

        const latest = entries[0];
        let channelName = handle;
        const channelNameMatch = xml.match(/<name>([^<]+)<\/name>/);
        if (channelNameMatch) channelName = channelNameMatch[1];

        const avatarMatch = xml.match(/<media:thumbnail url="([^"]+)"/);

        console.log(`[YT CONTENT] ${handle}: video ${latest.videoId}`);

        return {
            isLive: true,
            videoId: latest.videoId,
            title: latest.title || 'New YouTube Video',
            channelName,
            avatarUrl: avatarMatch ? avatarMatch[1] : null,
            thumbnailUrl: `https://i.ytimg.com/vi/${latest.videoId}/hqdefault.jpg`,
            streamUrl: contentType === 'shorts'
                ? `https://www.youtube.com/shorts/${latest.videoId}`
                : `https://www.youtube.com/watch?v=${latest.videoId}`
        };
    } catch (e) {
        console.error(`[YT CONTENT ERROR] ${handle}:`, e.message);
        return { isLive: false, error: true };
    }
}

// ============ TIKTOK LIVE ============

async function checkTiktokLive(username) {
    // Primary: tiktok-live-connector (cached connection)
    const conn = getTiktokConnection(username);
    if (conn) {
        try {
            const isLive = await conn.fetchIsLive();
            if (!isLive) {
                console.log(`[TIKTOK LIVE] ${username}: offline (connector)`);
                return { isLive: false };
            }
            const roomInfo = await conn.fetchRoomInfo();
            console.log(`[TIKTOK LIVE] ${username}: LIVE (connector)!`);
            return {
                isLive: true,
                videoId: roomInfo?.room_id || roomInfo?.id_str || `live_${username}`,
                title: roomInfo?.title || roomInfo?.room_title || 'Live di TikTok',
                channelName: roomInfo?.owner?.nickname || username,
                avatarUrl: roomInfo?.owner?.avatar_thumb?.url_list?.[0] || null,
                thumbnailUrl: roomInfo?.cover?.url_list?.[0] || roomInfo?.room_cover?.url_list?.[0] || null,
                streamUrl: `https://www.tiktok.com/@${username}/live`
            };
        } catch (e) {
            const errMsg = e.message || String(e);
            if (errMsg.toLowerCase().includes('offline') || e.constructor?.name === 'UserOfflineError') {
                console.log(`[TIKTOK LIVE] ${username}: offline (connector error)`);
                return { isLive: false };
            }
            console.error(`[TIKTOK LIVE] ${username}: connector error:`, errMsg.substring(0, 150));
        }
    }

    // Fallback: HTML scraping
    return checkTiktokLiveFallback(username);
}

async function checkTiktokLiveFallback(username) {
    try {
        const res = await fetchWithTimeout(`https://www.tiktok.com/@${username}/live`, {
            headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }
        }, 20000);
        if (!res.ok) {
            console.log(`[TIKTOK LIVE FB] ${username}: HTTP ${res.status}`);
            return { isLive: false };
        }

        const html = await res.text();
        let isLive = false;
        let roomId = null;
        let title = null;
        let avatarUrl = null;
        let channelName = username;
        let thumbnailUrl = null;

        // Strategy 1: __UNIVERSAL_DATA_FOR_REHYDRATION__ (current TikTok format)
        const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
        if (universalMatch) {
            try {
                const data = JSON.parse(universalMatch[1]);
                const roomData = data?.__DEFAULT_SCOPE__?.['webapp.live-room']?.liveRoom;
                if (roomData?.status === 2 || roomData?.isLiving === true) {
                    isLive = true;
                }
                if (roomData?.roomInfo) {
                    roomId = roomData.roomInfo.id || roomData.roomInfo.roomId;
                    title = roomData.roomInfo.title;
                    thumbnailUrl = (roomData.roomInfo.coverUrl || '').replace(/\\u002F/g, '/');
                    if (roomData.roomInfo.anchor) {
                        channelName = roomData.roomInfo.anchor.nickname || username;
                        avatarUrl = (roomData.roomInfo.anchor.avatarUrl || '').replace(/\\u002F/g, '/');
                    }
                }
            } catch (_) {}
        }

        // Strategy 2: raw roomStatus match
        if (!isLive) {
            isLive = html.includes('"roomStatus":2') || html.includes('"roomStatus": 2');
        }

        // Strategy 3: roomInfo JSON extraction
        if (!isLive && !roomId) {
            const roomMatch = html.match(/"roomId"\s*:\s*"(\d+)"/) || html.match(/"room_id"\s*:\s*"(\d+)"/);
            if (roomMatch) {
                roomId = roomMatch[1];
                isLive = true;
            }
        }

        if (!isLive) {
            console.log(`[TIKTOK LIVE FB] ${username}: not live`);
            return { isLive: false };
        }

        // Fill remaining metadata
        if (!channelName || channelName === username) {
            const nm = html.match(/"nickname":"([^"]+)"/);
            if (nm) channelName = nm[1];
        }
        if (!title) {
            const tm = html.match(/"roomTitle":"([^"]+)"/) || html.match(/"title":"([^"]+)"/);
            title = tm ? tm[1] : 'Live di TikTok';
        }
        if (!avatarUrl) {
            const am = html.match(/"avatarLarger":"([^"]+)"/) || html.match(/"avatarThumb":"([^"]+)"/);
            if (am) avatarUrl = am[1].replace(/\\u002F/g, '/');
        }
        if (!thumbnailUrl) {
            const cm = html.match(/"coverUrl":\["([^"]+)"/) || html.match(/"cover":"([^"]+)"/);
            if (cm) thumbnailUrl = cm[1].replace(/\\u002F/g, '/');
            else if (avatarUrl) thumbnailUrl = avatarUrl;
        }
        if (!roomId) {
            const rm = html.match(/"roomId":"(\d+)"/) || html.match(/"room_id":"(\d+)"/);
            roomId = rm ? rm[1] : 'live_' + username;
        }

        console.log(`[TIKTOK LIVE FB] ${username}: LIVE! roomId=${roomId}`);

        return {
            isLive: true,
            videoId: roomId,
            title,
            channelName,
            avatarUrl,
            thumbnailUrl,
            streamUrl: `https://www.tiktok.com/@${username}/live`
        };
    } catch (e) {
        console.error(`[TIKTOK LIVE FB ERROR] ${username}:`, e.message);
        return { isLive: false, error: true };
    }
}

// ============ TIKTOK CONTENT (VIDEOS) ============

async function checkTiktokContent(username) {
    // Primary: tiktok-live-connector (check if currently live = new content)
    const conn = getTiktokConnection(username);
    if (conn) {
        try {
            const isLive = await conn.fetchIsLive();
            if (isLive) {
                const roomInfo = await conn.fetchRoomInfo();
                return {
                    isLive: true,
                    videoId: roomInfo?.room_id || roomInfo?.id_str || `live_${username}`,
                    title: roomInfo?.title || roomInfo?.room_title || 'Live di TikTok',
                    channelName: roomInfo?.owner?.nickname || username,
                    avatarUrl: roomInfo?.owner?.avatar_thumb?.url_list?.[0] || null,
                    thumbnailUrl: roomInfo?.cover?.url_list?.[0] || null,
                    streamUrl: `https://www.tiktok.com/@${username}/live`
                };
            }
        } catch (e) {
            const errMsg = e.message || String(e);
            if (!errMsg.toLowerCase().includes('offline')) {
                console.error(`[TIKTOK CONTENT] ${username}: connector error:`, errMsg.substring(0, 150));
            }
        }
    }

    // Fallback: TikTok page scraping (__UNIVERSAL_DATA_FOR_REHYDRATION__)
    try {
        const res = await fetchWithTimeout(`https://www.tiktok.com/@${username}`, {
            headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }
        }, 20000);
        if (!res.ok) {
            console.log(`[TIKTOK CONTENT] ${username}: HTTP ${res.status}`);
            return { isLive: false };
        }

        const html = await res.text();

        let channelName = username;
        let avatarUrl = null;
        let latestVideo = null;

        // Strategy 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
        const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
        if (universalMatch) {
            try {
                const data = JSON.parse(universalMatch[1]);
                const scope = data?.__DEFAULT_SCOPE__;
                const user = scope?.['webapp.user-detail']?.userInfo?.user;
                if (user) {
                    channelName = user.nickname || username;
                    avatarUrl = user.avatarLarger || user.avatarThumb || null;
                }
                const userPost = scope?.['webapp.user-post']?.itemList;
                if (Array.isArray(userPost) && userPost.length > 0) {
                    latestVideo = userPost[0];
                }
            } catch (_) {}
        }

        // Strategy 2: regex extraction of video IDs
        if (!latestVideo) {
            const videoIdMatches = [...html.matchAll(/"id"\s*:\s*"(\d{15,})"/g)];
            const videoIds = [...new Set(videoIdMatches.map(m => m[1]))].slice(0, 5);
            for (const videoId of videoIds) {
                const idx = html.indexOf(`"${videoId}"`);
                if (idx === -1) continue;
                const sub = html.substring(idx, idx + 3000);
                const descMatch = sub.match(/"desc"\s*:\s*"([^"]*?)"/);
                if (descMatch) {
                    latestVideo = { id: videoId, desc: descMatch[1] };
                    break;
                }
            }
        }

        // Fill nickname/avatar from raw HTML if not set
        if (!channelName || channelName === username) {
            const nm = html.match(/"nickname":"([^"]+)"/);
            if (nm) channelName = nm[1];
        }
        if (!avatarUrl) {
            const am = html.match(/"avatarLarger":"([^"]+)"/) || html.match(/"avatarThumb":"([^"]+)"/);
            if (am) avatarUrl = am[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
        }

        if (!latestVideo || !latestVideo.id) {
            console.log(`[TIKTOK CONTENT] ${username}: no video found`);
            return { isLive: false };
        }

        const videoId = latestVideo.id;
        const desc = latestVideo.desc || 'New TikTok Video';

        // Try to extract thumbnail from surrounding HTML
        let thumbnailUrl = null;
        const coverMatch = html.match(new RegExp(`"${videoId}"[\\s\\S]{0,3000}?"cover"\\s*:\\s*\\{[^}]*"url"\\s*:\\s*"([^"]+)"`));
        const dynamicCoverMatch = html.match(new RegExp(`"${videoId}"[\\s\\S]{0,3000}?"dynamicCover"\\s*:\\s*\\{[^}]*"url"\\s*:\\s*"([^"]+)"`));
        const simpleCoverMatch = html.match(new RegExp(`"${videoId}"[\\s\\S]{0,3000}?"cover"\\s*:\\s*"([^"]+)"`));
        thumbnailUrl = (coverMatch?.[1] || dynamicCoverMatch?.[1] || simpleCoverMatch?.[1] || null)?.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');

        console.log(`[TIKTOK CONTENT] ${username}: video ${videoId}`);

        return {
            isLive: true,
            videoId,
            title: desc.length > 100 ? desc.substring(0, 100) + '...' : desc,
            channelName,
            avatarUrl,
            thumbnailUrl,
            streamUrl: `https://www.tiktok.com/@${username}/video/${videoId}`
        };
    } catch (e) {
        console.error(`[TIKTOK CONTENT ERROR] ${username}:`, e.message);
        return { isLive: false, error: true };
    }
}

// ============ MAIN ============

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Siap! Login sebagai ${client.user.tag}`);

        await sendOrUpdateStatus(client);
        await sendOrUpdateGameStatus(client);
        await updateStats(client, true);
        setInterval(() => { updateStats(client); }, 10 * 60 * 1000);

        console.log('[MONITOR] Menyalakan sistem monitoring...');

        const db = readDb();
        for (const item of db) {
            if (item.lastStreamId === undefined) item.lastStreamId = null;
            if (item.offlineCount === undefined) item.offlineCount = 0;
        }
        writeDb(db);

        console.log(`[MONITOR] ${db.length} akun dipantau`);

        setInterval(async () => {
            const db = readDb();
            if (db.length === 0) return;

            let updated = false;

            for (let i = 0; i < db.length; i++) {
                const item = db[i];
                let status = { isLive: false };

                try {
                    if (item.platform === 'youtube') {
                        const cType = item.contentType || 'live';
                        status = (cType === 'live')
                            ? await checkYoutubeLive(item.handle)
                            : await checkYoutubeContent(item.handle, cType);
                    } else if (item.platform === 'tiktok') {
                        const cType = item.contentType || 'live';
                        status = (cType === 'live')
                            ? await checkTiktokLive(item.handle)
                            : await checkTiktokContent(item.handle);
                    }
                } catch (err) {
                    console.error(`[MONITOR] Error checking ${item.handle}:`, err.message);
                }

                if (status.error) continue;

                if (!status.isLive || !status.videoId) {
                    if (item.lastStreamId) {
                        db[i].offlineCount = (item.offlineCount || 0) + 1;
                    }
                    continue;
                }

                if (item.lastStreamId === status.videoId) continue;

                // First run: set lastStreamId without notification
                if (!item.lastStreamId) {
                    console.log(`[MONITOR] First run: ${item.handle} -> lastStreamId=${status.videoId}`);
                    db[i].lastStreamId = status.videoId;
                    db[i].offlineCount = 0;
                    updated = true;
                    continue;
                }

                // Send notification
                try {
                    const cType = item.contentType || 'live';
                    const targetChannelId = item.discordChannelId || ((cType === 'live') ? CHANNEL_LIVE : CHANNEL_CONTENT);
                    const targetChannel = await client.channels.fetch(targetChannelId);
                    if (!targetChannel) {
                        console.error(`[MONITOR] Channel ${targetChannelId} not found for ${item.handle}`);
                        continue;
                    }

                    const isYT = item.platform === 'youtube';
                    const platformColor = isYT ? 0xFF0000 : 0xFE2C55;
                    const platformIcon = isYT
                        ? 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
                        : 'https://cdn-icons-png.flaticon.com/512/3046/3046124.png';

                    let contentAlert = '';
                    let buttonLabel = 'Watch';
                    let footerText = '';

                    if (isYT) {
                        if (cType === 'live') { contentAlert = `**${status.channelName}** is live!`; buttonLabel = 'Watch Stream'; footerText = 'YouTube Live'; }
                        else if (cType === 'shorts') { contentAlert = `**${status.channelName}** posted a new Short!`; buttonLabel = 'Watch Shorts'; footerText = 'YouTube Shorts'; }
                        else { contentAlert = `**${status.channelName}** uploaded a new video!`; buttonLabel = 'Watch Video'; footerText = 'YouTube Video'; }
                    } else {
                        if (cType === 'live') { contentAlert = `**${status.channelName}** is live!`; buttonLabel = 'Watch Stream'; footerText = 'TikTok Live'; }
                        else { contentAlert = `**${status.channelName}** posted a new video!`; buttonLabel = 'Watch Video'; footerText = 'TikTok Video'; }
                    }

                    const embed = new EmbedBuilder()
                        .setColor(platformColor)
                        .setAuthor({ name: status.channelName, iconURL: status.avatarUrl || platformIcon, url: status.streamUrl })
                        .setTitle(status.title)
                        .setURL(status.streamUrl)
                        .setFooter({ text: footerText, iconURL: platformIcon })
                        .setTimestamp();

                    if (status.thumbnailUrl) embed.setImage(status.thumbnailUrl);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel(buttonLabel)
                            .setStyle(ButtonStyle.Link)
                            .setURL(status.streamUrl)
                            .setEmoji(isYT ? '🎬' : '🎵')
                    );

                    await targetChannel.send({ content: contentAlert, embeds: [embed], components: [row] });
                    console.log(`[MONITOR] Alert sent: ${item.handle} (${item.platform} - ${cType}) -> ${targetChannelId}`);

                    db[i].lastStreamId = status.videoId;
                    db[i].offlineCount = 0;
                    updated = true;
                } catch (err) {
                    console.error(`[MONITOR] Failed send alert for ${item.handle}:`, err.message);
                }

                // Delay 2s between requests to avoid rate limiting
                await sleep(2000);
            }

            if (updated) writeDb(db);
        }, 60000);
    },
};
