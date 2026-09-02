const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateStats } = require('../utils/statsManager');
const { sendOrUpdateStatus } = require('../utils/statusBuilder');
const { sendOrUpdateGameStatus } = require('../utils/gameStatusBuilder');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'live-monitor.json');

const CHANNEL_CONTENT = '1494148923013595156';
const CHANNEL_LIVE = '1494148813441732750';

function readDb() {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('Error readDb:', e);
        return [];
    }
}

function writeDb(data) {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writeDb:', e);
    }
}

async function checkYoutubeLive(handle) {
    try {
        const url = `https://www.youtube.com/${handle}/live`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        if (!res.ok) return { isLive: false, error: true };

        const html = await res.text();
        const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
        const canonical = canonicalMatch ? canonicalMatch[1] : '';
        if (!canonical.includes('/watch')) return { isLive: false };

        const vMatch = canonical.match(/v=([^&]+)/);
        const videoId = vMatch ? vMatch[1] : null;
        if (!videoId) return { isLive: false };

        let title = 'Siaran Langsung YouTube';
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/) || html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch) title = titleMatch[1];

        let channelName = handle;
        const channelNameMatch = html.match(/<link itemprop="name" content="([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/);
        if (channelNameMatch) channelName = channelNameMatch[1];

        const avatarMatch = html.match(/(https:\/\/yt3\.ggpht\.com\/[^\s"'\=\?]+)/);
        const avatarUrl = avatarMatch ? avatarMatch[1] : null;

        return {
            isLive: true,
            videoId,
            title,
            channelName,
            avatarUrl,
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            streamUrl: `https://www.youtube.com/watch?v=${videoId}`
        };
    } catch (e) {
        console.error(`[YT ERROR] Gagal fetch ${handle}:`, e.message);
        return { isLive: false, error: true };
    }
}

async function checkYoutubeContent(handle, contentType) {
    try {
        const url = `https://www.youtube.com/${handle}/${contentType}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        if (!res.ok) return { isLive: false, error: true };

        const html = await res.text();
        const videoIdMatches = [...html.matchAll(/"videoId":"([^"]+)"/g)];
        const videoIds = [...new Set(videoIdMatches.map(m => m[1]))];

        const avatarMatch = html.match(/(https:\/\/yt3\.ggpht\.com\/[^\s"'\=\?]+)/);
        const avatarUrl = avatarMatch ? avatarMatch[1] : null;

        for (const videoId of videoIds) {
            const idx = html.indexOf(videoId);
            if (idx === -1) continue;
            const sub = html.substring(idx - 1000, idx + 8000);

            if (contentType === 'shorts') {
                const accessMatch = sub.match(/"accessibilityText":"([^"]+)"/);
                if (accessMatch) {
                    const accText = JSON.parse(`"${accessMatch[1]}"`);
                    const parts = accText.split(/,\s*\d+/);
                    const titlePart = parts[0] || accText;
                    let channelName = handle;
                    const channelNameMatch = html.match(/<link itemprop="name" content="([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/);
                    if (channelNameMatch) channelName = channelNameMatch[1];
                    return {
                        isLive: true,
                        videoId,
                        title: titlePart.trim(),
                        channelName,
                        avatarUrl,
                        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                        streamUrl: `https://www.youtube.com/shorts/${videoId}`
                    };
                }
            } else {
                const titleMatch = sub.match(/"title"\s*:\s*\{"content"\s*:\s*"([^"]+)"/);
                if (titleMatch) {
                    let channelName = handle;
                    const channelNameMatch = html.match(/<link itemprop="name" content="([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/);
                    if (channelNameMatch) channelName = channelNameMatch[1];
                    return {
                        isLive: true,
                        videoId,
                        title: JSON.parse(`"${titleMatch[1]}"`),
                        channelName,
                        avatarUrl,
                        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                        streamUrl: `https://www.youtube.com/watch?v=${videoId}`
                    };
                }
            }
        }
        return { isLive: false };
    } catch (e) {
        console.error(`[YT ${contentType.toUpperCase()} ERROR] Gagal fetch ${handle}:`, e.message);
        return { isLive: false, error: true };
    }
}

async function checkTiktokContent(username) {
    try {
        const url = `https://www.tiktok.com/@${username}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        if (!res.ok) return { isLive: false, error: true };

        const html = await res.text();

        let avatarUrl = null;
        const avatarMatch = html.match(/"avatarLarger":"([^"]+)"/) || html.match(/"avatarThumb":"([^"]+)"/);
        if (avatarMatch) {
            avatarUrl = avatarMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
        }

        let channelName = username;
        const nicknameMatch = html.match(/"nickname":"([^"]+)"/);
        if (nicknameMatch) {
            channelName = nicknameMatch[1];
        }

        // Method 1: Try UNIVERSAL_DATA_FOR_REHYDRATION (newer TikTok format)
        const universalDataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
        if (universalDataMatch) {
            try {
                const universalData = JSON.parse(universalDataMatch[1]);
                const defaultScope = universalData?.__DEFAULT_SCOPE__;
                const userDetail = defaultScope?.['webapp.user-detail'];
                const userInfo = userDetail?.userInfo;
                const user = userInfo?.user;

                if (user) {
                    channelName = user.nickname || username;
                    avatarUrl = user.avatarLarger || user.avatarThumb || avatarUrl;
                }

                const itemModule = defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct;
                if (itemModule?.id) {
                    return {
                        isLive: true,
                        videoId: itemModule.id,
                        title: itemModule.desc || 'New TikTok Video',
                        channelName,
                        avatarUrl,
                        thumbnailUrl: (itemModule.video?.cover || itemModule.video?.dynamicCover || null)?.replace(/\\u002F/g, '/'),
                        streamUrl: `https://www.tiktok.com/@${username}/video/${itemModule.id}`
                    };
                }

                // Try user post items
                const userPost = defaultScope?.['webapp.user-post']?.itemList;
                if (Array.isArray(userPost) && userPost.length > 0) {
                    const latest = userPost[0];
                    if (latest.id) {
                        return {
                            isLive: true,
                            videoId: latest.id,
                            title: latest.desc || 'New TikTok Video',
                            channelName,
                            avatarUrl,
                            thumbnailUrl: (latest.video?.cover || latest.video?.dynamicCover || null)?.replace(/\\u002F/g, '/'),
                            streamUrl: `https://www.tiktok.com/@${username}/video/${latest.id}`
                        };
                    }
                }
            } catch (parseErr) {
                // JSON parse failed, continue to other methods
            }
        }

        // Method 2: Try SIGI_STATE
        const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
        if (sigiMatch) {
            try {
                const sigiData = JSON.parse(sigiMatch[1]);
                const itemModule = sigiData?.ItemModule;
                if (itemModule) {
                    const items = Object.values(itemModule);
                    if (items.length > 0) {
                        const latest = items[0];
                        return {
                            isLive: true,
                            videoId: latest.id,
                            title: latest.desc || 'New TikTok Video',
                            channelName: latest.author?.uniqueId ? `@${latest.author.uniqueId}` : channelName,
                            avatarUrl: latest.author?.avatarThumb || avatarUrl,
                            thumbnailUrl: (latest.video?.cover || latest.video?.dynamicCover || null),
                            streamUrl: `https://www.tiktok.com/@${username}/video/${latest.id}`
                        };
                    }
                }
            } catch (parseErr) {
                // JSON parse failed, continue to other methods
            }
        }

        // Method 3: Fallback regex (original approach but improved)
        const videoIdMatches = [...html.matchAll(/"id"\s*:\s*"(\d{15,})"/g)];
        const videoIds = [...new Set(videoIdMatches.map(m => m[1]))].slice(0, 10);

        for (const videoId of videoIds) {
            const idx = html.indexOf(`"${videoId}"`);
            if (idx === -1) continue;
            const sub = html.substring(idx, idx + 3000);

            const descMatch = sub.match(/"desc"\s*:\s*"([^"]*?)"/);
            if (descMatch) {
                const coverMatch = sub.match(/"cover"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
                const dynamicCoverMatch = sub.match(/"dynamicCover"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
                const simpleCoverMatch = sub.match(/"cover"\s*:\s*"([^"]+)"/);
                const thumbnailUrl = (coverMatch?.[1] || dynamicCoverMatch?.[1] || simpleCoverMatch?.[1] || null)?.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');

                return {
                    isLive: true,
                    videoId,
                    title: descMatch[1] || 'New TikTok Video',
                    channelName,
                    avatarUrl,
                    thumbnailUrl,
                    streamUrl: `https://www.tiktok.com/@${username}/video/${videoId}`
                };
            }
        }

        return { isLive: false };
    } catch (e) {
        console.error(`[TIKTOK CONTENT ERROR] ${username}:`, e.message);
        return { isLive: false, error: true };
    }
}

async function checkTiktokLive(username) {
    try {
        const url = `https://www.tiktok.com/@${username}/live`;
        const res = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        if (!res.ok) return { isLive: false };

        const html = await res.text();
        const isOffline = html.includes('"roomStatus":4') || html.includes('LIVE_STUDIO_OFFLINE') || html.includes('is_offline":true') || (!html.includes('"roomStatus":2') && !html.includes('"roomTitle"'));
        if (isOffline) {
            return { isLive: false };
        }

        let avatarUrl = null;
        const avatarMatch = html.match(/"avatarLarger":"([^"]+)"/) || html.match(/"avatarThumb":"([^"]+)"/);
        if (avatarMatch) avatarUrl = avatarMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');

        let channelName = username;
        const nicknameMatch = html.match(/"nickname":"([^"]+)"/);
        if (nicknameMatch) channelName = nicknameMatch[1];

        let title = `Siaran langsung @${username} sedang berjalan di TikTok!`;
        const roomTitleMatch = html.match(/"roomTitle":"([^"]+)"/) || html.match(/"title":"([^"]+)"/);
        if (roomTitleMatch && roomTitleMatch[1]) {
            title = roomTitleMatch[1];
        }

        let thumbnailUrl = null;
        const coverMatch = html.match(/"coverUrl":\["([^"]+)"/) || html.match(/"cover":"([^"]+)"/);
        if (coverMatch) {
            thumbnailUrl = coverMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
        } else if (avatarUrl) {
            thumbnailUrl = avatarUrl;
        }

        const roomIdMatch = html.match(/"roomId":"(\d+)"/) || html.match(/"room_id":"(\d+)"/);
        const roomId = roomIdMatch ? roomIdMatch[1] : 'live_' + username;

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
        console.error(`[TIKTOK ERROR] ${username}:`, e.message);
        return { isLive: false, error: true };
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Siap! Login sebagai ${client.user.tag}`);

        await sendOrUpdateStatus(client);
        await sendOrUpdateGameStatus(client);
        await updateStats(client, true);
        setInterval(() => { updateStats(client); }, 10 * 60 * 1000);

        console.log('[MONITOR] Menyalakan sistem monitoring YouTube & TikTok...');
        setInterval(async () => {
            const db = readDb();
            if (db.length === 0) return;

            let updated = false;

            for (let i = 0; i < db.length; i++) {
                const item = db[i];
                let status = { isLive: false };

                if (item.platform === 'youtube') {
                    const cType = item.contentType || 'live';
                    status = (cType === 'live') ? await checkYoutubeLive(item.handle) : await checkYoutubeContent(item.handle, cType);
                } else if (item.platform === 'tiktok') {
                    const cType = item.contentType || 'live';
                    status = (cType === 'live') ? await checkTiktokLive(item.handle) : await checkTiktokContent(item.handle);
                }

                if (status.error) continue;

                if (status.isLive && status.videoId && item.lastStreamId !== status.videoId) {
                    try {
                        const cType = item.contentType || 'live';
                        const targetChannelId = item.discordChannelId || ((cType === 'live') ? CHANNEL_LIVE : CHANNEL_CONTENT);
                        const targetChannel = await client.channels.fetch(targetChannelId);
                        if (targetChannel) {
                            const defaultIcon = item.platform === 'youtube'
                                ? 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
                                : 'https://cdn-icons-png.flaticon.com/512/3046/3046124.png';

                            const platformColor = item.platform === 'youtube' ? 0xFF0000 : 0xFE2C55;
                            const platformIcon = item.platform === 'youtube'
                                ? 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
                                : 'https://cdn-icons-png.flaticon.com/512/3046/3046124.png';

                            let contentAlert = '';
                            let buttonLabel = 'Watch Stream';
                            let footerText = '';

                            if (item.platform === 'youtube') {
                                if (cType === 'live') {
                                    contentAlert = `**${status.channelName}** is live!`;
                                    buttonLabel = 'Watch Stream';
                                    footerText = 'YouTube Live';
                                } else if (cType === 'shorts') {
                                    contentAlert = `**${status.channelName}** posted a new Short!`;
                                    buttonLabel = 'Watch Shorts';
                                    footerText = 'YouTube Shorts';
                                } else {
                                    contentAlert = `**${status.channelName}** uploaded a new video!`;
                                    buttonLabel = 'Watch Video';
                                    footerText = 'YouTube Video';
                                }
                            } else if (item.platform === 'tiktok') {
                                if (cType === 'live') {
                                    contentAlert = `**${status.channelName}** is live!`;
                                    buttonLabel = 'Watch Stream';
                                    footerText = 'TikTok Live';
                                } else {
                                    contentAlert = `**${status.channelName}** posted a new video!`;
                                    buttonLabel = 'Watch Video';
                                    footerText = 'TikTok Video';
                                }
                            }

                            const embed = new EmbedBuilder()
                                .setColor(platformColor)
                                .setAuthor({
                                    name: status.channelName,
                                    iconURL: status.avatarUrl || defaultIcon,
                                    url: status.streamUrl
                                })
                                .setTitle(status.title)
                                .setURL(status.streamUrl)
                                .setFooter({ text: footerText, iconURL: platformIcon })
                                .setTimestamp();

                            if (status.thumbnailUrl) {
                                embed.setImage(status.thumbnailUrl);
                            } else if (item.platform === 'youtube' && status.videoId) {
                                embed.setImage(`https://i.ytimg.com/vi/${status.videoId}/hqdefault.jpg`);
                            }

                            const row = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setLabel(buttonLabel)
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(status.streamUrl)
                                    .setEmoji(item.platform === 'youtube' ? '🎬' : '🎵')
                            );

                            await targetChannel.send({ content: contentAlert, embeds: [embed], components: [row] });
                            console.log(`[MONITOR] Alert dikirim untuk ${item.handle} (${item.platform} - ${cType}) di channel ${targetChannelId}`);
                        }
                    } catch (err) {
                        console.error(`[MONITOR] Gagal mengirim alert:`, err.message);
                    }

                    db[i].lastStreamId = status.videoId;
                    updated = true;
                }
            }

            if (updated) writeDb(db);
        }, 180000);
    },
};
