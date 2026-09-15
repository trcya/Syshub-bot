const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const { getEmbed, getButtons } = require('../utils/welcomeEmbed');
const { generateCaptcha, generateCaptchaImage } = require('../utils/captcha');
const { buildStockEmbed, buildAdminEmbed, buildAdminRow, loadStock, saveStock, updateBothPanels } = require('../commands/setup-premium-stock');
const QRCode = require('qrcode');
const path = require('path');

const JOKI_TICKET_LOG_CHANNEL = '1545265772731957388';
const JOKI_CATEGORY_ID = '1545263915158478898';
const JOKI_ROLE_ID = '1498652236257951764';
const VERIFY_ROLE = '1494143210157510666';
const HIRING_CATEGORY_ID = '1549562684767338587';
const HIRING_STAFF_ID = '1498652010977824919';

const jokiTimeouts = new Map();
const pendingVerifications = new Map();
const jokiPayments = new Map();
const pendingHiring = new Map();

async function generateTranscript(channel) {
    let messages = [];
    let lastId = null;
    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const batch = await channel.messages.fetch(options);
        if (batch.size === 0) break;
        messages.push(...batch.values());
        lastId = batch.last().id;
    }
    messages.reverse();

    let transcript = `=== Transcript: ${channel.name} ===\nCreated: ${channel.createdAt.toISOString()}\n\n`;
    for (const msg of messages) {
        const time = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
        const content = msg.content || '';
        const embedsText = msg.embeds.length > 0 ? msg.embeds.map(e => `[Embed: ${e.title || 'no title'}]`).join(' ') : '';
        const attachmentsText = msg.attachments.size > 0 ? msg.attachments.map(a => `[Attachment: ${a.name}]`).join(' ') : '';
        transcript += `[${time}] ${msg.author.tag}: ${content} ${embedsText} ${attachmentsText}\n`;
    }
    return transcript;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // --- HANDLE SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const response = { content: 'There was an error while executing this command!', flags: [64] };
                if (interaction.replied || interaction.deferred) await interaction.followUp(response);
                else await interaction.reply(response);
            }
        }

        // --- HANDLE BUTTONS ---
        if (interaction.isButton()) {
            const { customId, guild, user, channel, member } = interaction;

            if (customId === 'lang_id' || customId === 'lang_en') {
                const lang = customId === 'lang_id' ? 'id' : 'en';
                return interaction.update({
                    embeds: [getEmbed(lang)],
                    components: [getButtons(lang)]
                });
            }

            // VERIFY SYSTEM
            if (customId === 'verify_start') {
                if (member.roles.cache.has(VERIFY_ROLE)) {
                    return interaction.reply({ content: 'Kamu sudah terverifikasi!', ephemeral: true });
                }

                const code = generateCaptcha(4);
                pendingVerifications.set(user.id, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

                const buffer = generateCaptchaImage(code);
                const captchaAttachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

                const logoPath = path.join(__dirname, '..', 'logo.png');
                const logoAttachment = new AttachmentBuilder(logoPath, { name: 'logo.png' });

                const embed = new EmbedBuilder()
                    .setTitle('Solve the captcha')
                    .setDescription('Enter the 4 digits shown below. You have 5 minutes.')
                    .setColor('#00bfff')
                    .setImage('attachment://captcha.png')
                    .setThumbnail('attachment://logo.png')
                    .setFooter({ text: 'SysHub Verification' })
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('verify_enter')
                            .setLabel('Enter code')
                            .setStyle(ButtonStyle.Primary)
                    );

                return interaction.reply({ embeds: [embed], components: [row], files: [logoAttachment, captchaAttachment], ephemeral: true });
            }

            if (customId === 'verify_enter') {
                const pending = pendingVerifications.get(user.id);
                if (!pending) {
                    return interaction.reply({ content: 'Klik tombol **Verify** lagi untuk mendapatkan captcha baru.', ephemeral: true });
                }
                if (Date.now() > pending.expiresAt) {
                    pendingVerifications.delete(user.id);
                    return interaction.reply({ content: 'Captcha sudah expired! Klik tombol **Verify** lagi.', ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId('verify_modal')
                    .setTitle('Masukkan Kode Captcha');

                const input = new TextInputBuilder()
                    .setCustomId('verify_code_input')
                    .setLabel('Masukkan 4 digit dari captcha')
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(4)
                    .setMaxLength(4)
                    .setPlaceholder('Contoh: 4536')
                    .setRequired(true);

                const actionRow = new ActionRowBuilder().addComponents(input);
                modal.addComponents(actionRow);

                return interaction.showModal(modal);
            }

            // === COUNTRY ROLE TOGGLE HANDLERS ===
            const countryRoleMap = {
                'country_role_id': '1547633283662086231',
                'country_role_ph': '1547633286551965776',
                'country_role_us': '1547633298241626143',
                'country_role_my': '1547633299864952883',
                'country_role_vn': '1547633302025015426',
            };

            if (countryRoleMap[customId]) {
                const roleId = countryRoleMap[customId];
                const role = guild.roles.cache.get(roleId);
                if (!role) {
                    return interaction.reply({ content: 'Role tidak ditemukan!', ephemeral: true });
                }

                const hasRole = member.roles.cache.has(roleId);
                try {
                    if (hasRole) {
                        await member.roles.remove(roleId);
                        return interaction.reply({ content: `🗑️ Role **${role.name}** telah dilepas.`, ephemeral: true });
                    } else {
                        await member.roles.add(roleId);
                        return interaction.reply({ content: `✅ Role **${role.name}** telah ditambahkan.`, ephemeral: true });
                    }
                } catch (err) {
                    console.error('[COUNTRY ROLE] Error:', err.message);
                    return interaction.reply({ content: 'Gagal mengubah role. Hubungi admin.', ephemeral: true });
                }
            }

            const logChannel = guild.channels.cache.get(process.env.TICKET_LOG_CHANNEL_ID);
            const staffId = process.env.MIDMAN_STAFF_ID;

            // 1. OPEN TICKET - SHOW FORM MODAL
            if (customId === 'open_midman_ticket') {
                const ticketName = `midman-${user.username}`;
                const existingTicket = guild.channels.cache.find(c => c.name === ticketName.toLowerCase());
                if (existingTicket) return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });

                const modal = new ModalBuilder()
                    .setCustomId('midman_modal')
                    .setTitle('Format Midman Ticket');

                const jenisInput = new TextInputBuilder()
                    .setCustomId('jenis_midman')
                    .setLabel('Jenis Midman (Tidak Menerima Akun)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: Growtopia WL, Robux, Item, dll.')
                    .setRequired(true);

                const hargaInput = new TextInputBuilder()
                    .setCustomId('jumlah_harga')
                    .setLabel('Jumlah Harga')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: 150000 atau 150k')
                    .setRequired(true);

                const lawanInput = new TextInputBuilder()
                    .setCustomId('lawan_transaksi')
                    .setLabel('Lawan Transaksi (Username/ID)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Tag atau ketik username penjual/pembeli')
                    .setRequired(true);

                const firstRow = new ActionRowBuilder().addComponents(jenisInput);
                const secondRow = new ActionRowBuilder().addComponents(hargaInput);
                const thirdRow = new ActionRowBuilder().addComponents(lawanInput);

                modal.addComponents(firstRow, secondRow, thirdRow);

                await interaction.showModal(modal);
            }

            // 2. CLAIM TICKET
            if (customId === 'claim_ticket') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can claim tickets!', ephemeral: true });
                }

                const oldEmbed = interaction.message.embeds[0];
                const oldDesc = oldEmbed?.description || '';
                const oldFields = oldEmbed?.fields || [];

                const claimDesc = oldDesc
                    .replace(/\*\*Staff <@&\d+> must claim this ticket first\.\*\*/, '')
                    .replace(/\n\n$/, '')
                    .trim();

                const claimEmbed = new EmbedBuilder()
                    .setTitle(oldEmbed?.title || '🤝 Midman Ticket')
                    .setColor('#FEE75C')
                    .setDescription(`${claimDesc}\n\n✅ **Ticket claimed by** ${user}\nStaff akan membantu kamu sekarang.`)
                    .setTimestamp();

                for (const field of oldFields) {
                    claimEmbed.addFields({ name: field.name, value: field.value, inline: field.inline });
                }

                if (oldEmbed?.footer) claimEmbed.setFooter({ text: oldEmbed.footer.text });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('add_midman_user').setLabel('Add User').setStyle(ButtonStyle.Primary).setEmoji('👤'),
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('cancel_ticket').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('✖️'),
                    );

                await interaction.update({ embeds: [claimEmbed], components: [row] });

                if (logChannel) {
                    const logEmbed = new EmbedBuilder().setTitle('📌 Ticket Claimed').setColor('#FEE75C').addFields({ name: 'Staff', value: `${user} (${user.id})`, inline: true }, { name: 'Channel', value: `${channel.name}`, inline: true }).setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            // 2b. ADD MIDMAN USER - Show Modal
            if (customId === 'add_midman_user') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can add users!', ephemeral: true });
                }

                const modal = new ModalBuilder()
                    .setCustomId('add_user_modal')
                    .setTitle('Tambah User ke Ticket');

                const userIdInput = new TextInputBuilder()
                    .setCustomId('user_id_input')
                    .setLabel('User ID Discord')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: 123456789012345678')
                    .setRequired(true);

                const firstRow = new ActionRowBuilder().addComponents(userIdInput);
                modal.addComponents(firstRow);

                await interaction.showModal(modal);
            }

            // 3. CLOSE TICKET
            if (customId === 'close_ticket') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
                }

                await interaction.reply('Closing ticket in 5 seconds...');
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder().setTitle('🔒 Ticket Closed').setColor('#ED4245').addFields({ name: 'By', value: `${user} (${user.id})`, inline: true }, { name: 'Channel', value: `${channel.name}`, inline: true }).setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                setTimeout(() => channel.delete(), 5000);
            }

            // 4. CANCEL TICKET
            if (customId === 'cancel_ticket') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can cancel tickets!', ephemeral: true });
                }

                await interaction.reply('Transaction cancelled. Deleting channel...');
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder().setTitle('✖️ Ticket Cancelled').setColor('#95A5A6').addFields({ name: 'By', value: `${user} (${user.id})`, inline: true }, { name: 'Channel', value: `${channel.name}`, inline: true }).setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                setTimeout(() => channel.delete(), 2000);
            }

            // === HIRING TICKET HANDLERS ===

            // STREAMER / CREATOR BUTTON - SHOW FORM MODAL
            if (customId === 'hiring_streamer' || customId === 'hiring_creator') {
                const roleType = customId === 'hiring_streamer' ? 'Streamer' : 'Creator';
                const ticketName = `hiring-${user.username}`;
                const existingTicket = guild.channels.cache.find(c => c.name === ticketName.toLowerCase());
                if (existingTicket) return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });

                pendingHiring.set(user.id, { roleType });

                const modal = new ModalBuilder()
                    .setCustomId('hiring_modal')
                    .setTitle(`Form Apply ${roleType}`);

                const namaInput = new TextInputBuilder()
                    .setCustomId('nama_sosmed')
                    .setLabel('Nama Akun Sosmed (YouTube/TikTok/etc)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: @username atau link channel')
                    .setRequired(true);

                const videoInput = new TextInputBuilder()
                    .setCustomId('link_video')
                    .setLabel('Link Video yang Sudah Diupload')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: https://youtube.com/watch?v=...')
                    .setRequired(true);

                const firstRow = new ActionRowBuilder().addComponents(namaInput);
                const secondRow = new ActionRowBuilder().addComponents(videoInput);

                modal.addComponents(firstRow, secondRow);

                await interaction.showModal(modal);
            }

            // CLOSE HIRING TICKET
            if (customId === 'close_hiring_ticket') {
                if (!member.roles.cache.has(HIRING_STAFF_ID) && user.id !== HIRING_STAFF_ID) {
                    return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
                }

                await interaction.reply('Closing ticket in 5 seconds...');

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🔒 Hiring Ticket Closed')
                        .setColor('#ED4245')
                        .addFields(
                            { name: 'By', value: `${user} (${user.id})`, inline: true },
                            { name: 'Channel', value: `${channel.name}`, inline: true },
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                setTimeout(() => channel.delete(), 5000);
            }

            // === JOKI TICKET HANDLERS ===

            // 5. JOKI TREADMILL / TREADMILL+EGG / PRIVATE SERVER / REBIRTH / MAIN AKUN BUTTON - Create ticket
            if (customId === 'joki_treadmill' || customId === 'joki_treadmill_egg' || customId === 'joki_private_server' || customId === 'joki_rebirth' || customId === 'joki_main_akun') {
                const isEgg = customId === 'joki_treadmill_egg';
                const isPrivateServer = customId === 'joki_private_server';
                const isRebirth = customId === 'joki_rebirth';
                const isMainAkun = customId === 'joki_main_akun';
                let serviceType, serviceEmoji;

                if (isMainAkun) {
                    serviceType = 'Main Akun (Grow a Chicken Fighter)';
                    serviceEmoji = '🎮';
                } else if (isRebirth) {
                    serviceType = 'Rebirth';
                    serviceEmoji = '🔄';
                } else if (isPrivateServer) {
                    serviceType = 'Private Server Rental';
                    serviceEmoji = '🔒';
                } else if (isEgg) {
                    serviceType = 'Treadmill + Steal Egg';
                    serviceEmoji = '🥚';
                } else {
                    serviceType = 'Treadmill Only';
                    serviceEmoji = '🏃';
                }

                const ticketName = `joki-${user.username}`;
                const existingTicket = guild.channels.cache.find(c => c.name === ticketName.toLowerCase());
                if (existingTicket) {
                    return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const permissionOverwrites = [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                        { id: staffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: JOKI_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    ];

                    const ticketChannel = await guild.channels.create({
                        name: ticketName,
                        type: ChannelType.GuildText,
                        parent: JOKI_CATEGORY_ID,
                        permissionOverwrites,
                    });

                    const preEmbed = new EmbedBuilder()
                        .setTitle(`${serviceEmoji} Joki ${serviceType}`)
                        .setColor('#5865F2')
                        .setDescription(`Welcome ${user}!\nStaff akan segera membantu kamu.\n\nPilih durasi yang kamu inginkan:\n\n⚠️ **Jika tidak memilih durasi dalam 6 jam, kamu akan di-timeout selama 3 hari dan ticket akan ditutup!**${isMainAkun ? '\n\n✅ Auto Rebirth\n✅ Auto UFO (bebas request ayam yang mau di naikin)\n✅ Auto Event (kalo ada event khusus)' : ''}`)
                        .setFooter({ text: 'SysHub Joki Service' })
                        .setTimestamp();

                    const tBtns1 = [
                        { id: 'joki_dur_6j',  label: '6 Jam — 5K' },
                        { id: 'joki_dur_12j', label: '12 Jam — 8K' },
                        { id: 'joki_dur_1h',  label: '1 Hari — 12K' },
                        { id: 'joki_dur_2h',  label: '2 Hari — 20K' },
                        { id: 'joki_dur_3h',  label: '3 Hari — 30K' },
                    ];
                    const tBtns2 = [
                        { id: 'joki_dur_5h',  label: '5 Hari — 42K' },
                        { id: 'joki_dur_7h',  label: '7 Hari — 55K' },
                        { id: 'joki_dur_14h', label: '14 Hari — 100K' },
                        { id: 'joki_dur_21h', label: '21 Hari — 140K' },
                        { id: 'joki_dur_30h', label: '30 Hari — 180K' },
                    ];
                    const eBtns1 = [
                        { id: 'joki_dur_egg_6j',  label: '6 Jam — 10K' },
                        { id: 'joki_dur_egg_12j', label: '12 Jam — 16K' },
                        { id: 'joki_dur_egg_1h',  label: '1 Hari — 25K' },
                        { id: 'joki_dur_egg_2h',  label: '2 Hari — 45K' },
                        { id: 'joki_dur_egg_3h',  label: '3 Hari — 65K' },
                    ];
                    const eBtns2 = [
                        { id: 'joki_dur_egg_5h',  label: '5 Hari — 95K' },
                        { id: 'joki_dur_egg_7h',  label: '7 Hari — 125K' },
                        { id: 'joki_dur_egg_14h', label: '14 Hari — 220K' },
                        { id: 'joki_dur_egg_21h', label: '21 Hari — 300K' },
                        { id: 'joki_dur_egg_30h', label: '30 Hari — 375K' },
                    ];
                    const psBtns1 = [
                        { id: 'joki_dur_ps_3j',  label: '3 Jam — 5K' },
                        { id: 'joki_dur_ps_6j',  label: '6 Jam — 9K' },
                        { id: 'joki_dur_ps_12j', label: '12 Jam — 15K' },
                    ];
                    const psBtns2 = [
                        { id: 'joki_dur_ps_1h',  label: '1 Hari — 25K' },
                        { id: 'joki_dur_ps_3h',  label: '3 Hari — 60K' },
                        { id: 'joki_dur_ps_7h',  label: '7 Hari — 120K' },
                    ];
                    const rBtns1 = [
                        { id: 'joki_dur_r1',   label: '1 Rebirth — 1K' },
                        { id: 'joki_dur_r50',  label: '50 Rebirth — 30K' },
                    ];
                    const rBtns2 = [
                        { id: 'joki_dur_r100', label: '100 Rebirth — 45K' },
                        { id: 'joki_dur_r500', label: '500 Rebirth — 200K' },
                    ];
                    const mBtns1 = [
                        { id: 'joki_dur_main_6j',  label: '6 Jam — 15K' },
                        { id: 'joki_dur_main_12j', label: '12 Jam — 25K' },
                        { id: 'joki_dur_main_1h',  label: '1 Hari — 40K' },
                    ];
                    const mBtns2 = [
                        { id: 'joki_dur_main_5h',  label: '5 Hari — 175K' },
                        { id: 'joki_dur_main_10h', label: '10 Hari — 300K' },
                    ];

                    const rows = [];
                    if (isMainAkun) {
                        rows.push(
                            new ActionRowBuilder().addComponents(mBtns1.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Danger))),
                            new ActionRowBuilder().addComponents(mBtns2.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Danger))),
                        );
                    } else if (isRebirth) {
                        rows.push(
                            new ActionRowBuilder().addComponents(rBtns1.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))),
                            new ActionRowBuilder().addComponents(rBtns2.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Secondary))),
                        );
                    } else if (isPrivateServer) {
                        rows.push(
                            new ActionRowBuilder().addComponents(psBtns1.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Primary))),
                            new ActionRowBuilder().addComponents(psBtns2.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(ButtonStyle.Primary))),
                        );
                    } else {
                        const btns = isEgg ? [eBtns1, eBtns2] : [tBtns1, tBtns2];
                        rows.push(
                            ...btns.map(pair => new ActionRowBuilder().addComponents(
                                pair.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(isEgg ? ButtonStyle.Success : ButtonStyle.Primary))
                            ))
                        );
                    }

                    const closeRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('close_joki_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('✖️'),
                    );
                    rows.push(closeRow);

                    await ticketChannel.send({ content: `${user} | <@&${JOKI_ROLE_ID}>`, embeds: [preEmbed], components: rows });
                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });

                    const timeoutKey = ticketChannel.id;
                    const timeoutMs = 6 * 60 * 60 * 1000;
                    const timeoutDuration = 3 * 24 * 60 * 60 * 1000;

                    const timeoutId = setTimeout(async () => {
                        jokiTimeouts.delete(timeoutKey);
                        try {
                            const memberToTimeout = await guild.members.fetch(user.id);
                            await memberToTimeout.timeout(timeoutDuration, 'Tidak memilih durasi joki dalam 6 jam');
                            await ticketChannel.send(`⚠️ ${user} telah di-timeout selama 3 hari karena tidak memilih durasi dalam 6 jam.`);
                            await ticketChannel.send(`🔒 Ticket akan ditutup dalam 5 detik...`);
                            setTimeout(() => ticketChannel.delete(), 5000);
                        } catch (err) {
                            console.error('Failed to timeout user:', err);
                        }
                    }, timeoutMs);

                    jokiTimeouts.set(timeoutKey, timeoutId);

                    const jokiLogChannel = guild.channels.cache.get(JOKI_TICKET_LOG_CHANNEL);
                    if (jokiLogChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎫 Joki Ticket Opened')
                            .setColor('#57F287')
                            .addFields(
                                { name: 'User', value: `${user} (${user.id})`, inline: true },
                                { name: 'Channel', value: ticketChannel.name, inline: true },
                                { name: 'Layanan', value: serviceType, inline: true },
                            )
                            .setTimestamp();
                        jokiLogChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    console.error('Failed to create joki ticket:', error);
                    await interaction.editReply({ content: 'Failed to create ticket channel. Please contact an administrator.' });
                }
            }

            // 6. JOKI DURATION BUTTON - Update ticket with selected duration
            if (customId.startsWith('joki_dur_')) {
                const jokiDurMap = {
                    'joki_dur_6j':       { label: '6 Jam', price: 5000 },
                    'joki_dur_12j':      { label: '12 Jam', price: 8000 },
                    'joki_dur_1h':       { label: '1 Hari', price: 12000 },
                    'joki_dur_2h':       { label: '2 Hari', price: 20000 },
                    'joki_dur_3h':       { label: '3 Hari', price: 30000 },
                    'joki_dur_5h':       { label: '5 Hari', price: 42000 },
                    'joki_dur_7h':       { label: '7 Hari', price: 55000 },
                    'joki_dur_14h':      { label: '14 Hari', price: 100000 },
                    'joki_dur_21h':      { label: '21 Hari', price: 140000 },
                    'joki_dur_30h':      { label: '30 Hari', price: 180000 },
                    'joki_dur_egg_6j':   { label: '6 Jam', price: 10000 },
                    'joki_dur_egg_12j':  { label: '12 Jam', price: 16000 },
                    'joki_dur_egg_1h':   { label: '1 Hari', price: 25000 },
                    'joki_dur_egg_2h':   { label: '2 Hari', price: 45000 },
                    'joki_dur_egg_3h':   { label: '3 Hari', price: 65000 },
                    'joki_dur_egg_5h':   { label: '5 Hari', price: 95000 },
                    'joki_dur_egg_7h':   { label: '7 Hari', price: 125000 },
                    'joki_dur_egg_14h':  { label: '14 Hari', price: 220000 },
                    'joki_dur_egg_21h':  { label: '21 Hari', price: 300000 },
                    'joki_dur_egg_30h':  { label: '30 Hari', price: 375000 },
                    'joki_dur_ps_3j':    { label: '3 Jam', price: 5000 },
                    'joki_dur_ps_6j':    { label: '6 Jam', price: 9000 },
                    'joki_dur_ps_12j':   { label: '12 Jam', price: 15000 },
                    'joki_dur_ps_1h':    { label: '1 Hari', price: 25000 },
                    'joki_dur_ps_3h':    { label: '3 Hari', price: 60000 },
                    'joki_dur_ps_7h':    { label: '7 Hari', price: 120000 },
                    'joki_dur_r1':       { label: '1 Rebirth', price: 1000 },
                    'joki_dur_r50':      { label: '50 Rebirth', price: 30000 },
                    'joki_dur_r100':     { label: '100 Rebirth', price: 45000 },
                    'joki_dur_r500':     { label: '500 Rebirth', price: 200000 },
                    'joki_dur_main_6j':  { label: '6 Jam', price: 15000 },
                    'joki_dur_main_12j': { label: '12 Jam', price: 25000 },
                    'joki_dur_main_1h':  { label: '1 Hari', price: 40000 },
                    'joki_dur_main_5h':  { label: '5 Hari', price: 175000 },
                    'joki_dur_main_10h': { label: '10 Hari', price: 300000 },
                };

                const opt = jokiDurMap[customId];
                if (!opt) return;

                const timeoutKey = channel.id;
                if (jokiTimeouts.has(timeoutKey)) {
                    clearTimeout(jokiTimeouts.get(timeoutKey));
                    jokiTimeouts.delete(timeoutKey);
                }

                const formatPrice = (v) => 'Rp ' + v.toLocaleString('id-ID');
                const isEgg = customId.includes('egg');
                const isPrivateServer = customId.includes('ps');
                const isRebirth = customId.startsWith('joki_dur_r');
                const isMainAkun = customId.startsWith('joki_dur_main');
                let serviceType, color;

                if (isMainAkun) {
                    serviceType = '🎮 Main Akun (Grow a Chicken Fighter)';
                    color = '#ED4245';
                } else if (isRebirth) {
                    serviceType = '🔄 Rebirth';
                    color = '#FFD700';
                } else if (isPrivateServer) {
                    serviceType = '🔒 Private Server Rental';
                    color = '#5865F2';
                } else if (isEgg) {
                    serviceType = '🥚 Treadmill + Steal Egg';
                    color = '#57F287';
                } else {
                    serviceType = '🏃 Treadmill Only';
                    color = '#5865F2';
                }

                const oldEmbed = interaction.message.embeds[0];
                const embed = new EmbedBuilder()
                    .setTitle(oldEmbed?.title || '🤖 Joki Ticket')
                    .setColor(color)
                    .setDescription(`Welcome ${user}!\nStaff akan segera membantu kamu.`)
                    .addFields(
                        { name: '📋 Layanan', value: serviceType, inline: true },
                        { name: '⏱️ Durasi', value: `**${opt.label}**`, inline: true },
                        { name: '💰 Total Harga', value: `**${formatPrice(opt.price)}**`, inline: true },
                    )
                    .setFooter({ text: 'SysHub Joki Service' })
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('close_joki_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                    );

                await interaction.update({ embeds: [embed], components: [row] });

                await channel.send(`${user} memilih **${serviceType}** durasi **${opt.label}** — **${formatPrice(opt.price)}**`);

                // Create Pakasir payment transaction
                const orderId = `JOKI-${channel.id}-${Date.now()}`;
                try {
                    const payRes = await fetch(`https://app.pakasir.com/api/transactioncreate/qris`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project: process.env.PAKASIR_PROJECT,
                            order_id: orderId,
                            amount: opt.price,
                            api_key: process.env.PAKASIR_API_KEY,
                        }),
                    });
                    const payData = await payRes.json();

                    if (payData.payment) {
                        jokiPayments.set(channel.id, { orderId, amount: payData.payment.amount });

                        const qrBuffer = await QRCode.toBuffer(payData.payment.payment_number, { width: 400, margin: 2 });
                        const qrAttachment = new AttachmentBuilder(qrBuffer, { name: 'qris.png' });

                        const payEmbed = new EmbedBuilder()
                            .setTitle('💳 Pembayaran via Pakasir')
                            .setDescription(`Scan QR di bawah untuk melakukan pembayaran sebesar **${formatPrice(payData.payment.total_payment)}** (termasuk fee).\n\nOrder ID: \`${orderId}\`\n\nPembayaran akan dicek otomatis.`)
                            .setColor('#FF0000')
                            .setImage('attachment://qris.png')
                            .addFields(
                                { name: '💰 Total', value: formatPrice(payData.payment.total_payment), inline: true },
                                { name: '⏰ Expired', value: `<t:${Math.floor(new Date(payData.payment.expired_at).getTime() / 1000)}:R>`, inline: true },
                            )
                            .setFooter({ text: 'SysHub Joki Service' })
                            .setTimestamp();

                        await channel.send({ content: `${user}`, embeds: [payEmbed], files: [qrAttachment] });

                        // Auto-check payment status every 10 seconds
                        const checkInterval = setInterval(async () => {
                            try {
                                const detailRes = await fetch(`https://app.pakasir.com/api/transactiondetail?project=${process.env.PAKASIR_PROJECT}&order_id=${orderId}&amount=${payData.payment.amount}&api_key=${process.env.PAKASIR_API_KEY}`);
                                const detailData = await detailRes.json();

                                if (detailData.transaction && detailData.transaction.status === 'completed') {
                                    clearInterval(checkInterval);
                                    jokiPayments.delete(channel.id);

                                    // Update QR embed to success
                                    const messages = await channel.messages.fetch({ limit: 50 });
                                    for (const [, msg] of messages) {
                                        if (msg.embeds.length > 0 && msg.embeds[0].title === '💳 Pembayaran via Pakasir') {
                                            const successEmbed = new EmbedBuilder()
                                                .setTitle('✅ Pembayaran Berhasil')
                                                .setDescription('Pembayaran telah dikonfirmasi! Mengirim form data akun...')
                                                .setColor('#57F287')
                                                .setFooter({ text: 'SysHub Joki Service' })
                                                .setTimestamp();
                                            await msg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
                                            break;
                                        }
                                    }

                                    // Send account form embed
                                    const formEmbed = new EmbedBuilder()
                                        .setTitle('📝 Form Data Akun Joki')
                                        .setDescription('Silakan klik tombol **Isi Data Akun** di bawah ini untuk mengirim data akun kamu.')
                                        .setColor('#00bfff')
                                        .setFooter({ text: 'SysHub Joki Service' })
                                        .setTimestamp();

                                    const formRow = new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setCustomId('joki_account_form')
                                                .setLabel('Isi Data Akun')
                                                .setStyle(ButtonStyle.Primary)
                                                .setEmoji('📝'),
                                        );

                                    await channel.send({ content: `${user}`, embeds: [formEmbed], components: [formRow] });
                                }
                            } catch (err) {
                                console.error('[PAKASIR] Auto-check error:', err.message);
                            }
                        }, 10000);

                        // Stop checking after expired
                        setTimeout(() => clearInterval(checkInterval), 30 * 60 * 1000);

                    } else {
                        await channel.send({ content: '❌ Gagal membuat pembayaran. Silakan hubungi admin.' });
                    }
                } catch (err) {
                    console.error('[PAKASIR] Payment error:', err);
                    await channel.send({ content: '❌ Error saat membuat pembayaran. Silakan hubungi admin.' });
                }
            }

            // JOKI ACCOUNT FORM BUTTON - Send template
            if (customId === 'joki_account_form') {
                const templateEmbed = new EmbedBuilder()
                    .setTitle('📝 Form Data Akun Joki')
                    .setDescription('Silakan copy paste format di bawah ini, isi datanya, lalu kirim di channel ini:\n\n```\nUsername : \nPassword : \nVerif 2 Langkah : (Aktif/Tidak)\n\nJenis : \nJumlah Waktu : \nNote Untuk Admin : \n```')
                    .setColor('#00bfff')
                    .setFooter({ text: 'SysHub Joki Service' })
                    .setTimestamp();

                const prosesRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('joki_proses')
                            .setLabel('Proses Joki')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🚀'),
                    );

                await interaction.reply({ embeds: [templateEmbed], components: [prosesRow] });
            }

            // 8. CLOSE JOKI TICKET - Transcript + Delete
            if (customId === 'close_joki_ticket') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
                }

                const timeoutKey = channel.id;
                if (jokiTimeouts.has(timeoutKey)) {
                    clearTimeout(jokiTimeouts.get(timeoutKey));
                    jokiTimeouts.delete(timeoutKey);
                }

                await interaction.reply('Closing ticket and generating transcript...');

                const jokiLogChannel = guild.channels.cache.get(JOKI_TICKET_LOG_CHANNEL);

                try {
                    const transcript = await generateTranscript(channel);

                    if (jokiLogChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🔒 Joki Ticket Closed')
                            .setColor('#ED4245')
                            .addFields(
                                { name: 'By', value: `${user} (${user.id})`, inline: true },
                                { name: 'Channel', value: channel.name, inline: true },
                            )
                            .setTimestamp();

                        if (transcript.length > 1900) {
                            const chunks = transcript.match(/.{1,1900}/gs) || [];
                            await jokiLogChannel.send({ embeds: [logEmbed] });
                            for (const chunk of chunks) {
                                await jokiLogChannel.send({ content: '```\n' + chunk + '\n```' });
                            }
                        } else {
                            logEmbed.addFields({ name: 'Transcript', value: '```\n' + transcript + '\n```' });
                            await jokiLogChannel.send({ embeds: [logEmbed] });
                        }
                    }
                } catch (err) {
                    console.error('Failed to generate transcript:', err);
                }

                setTimeout(() => channel.delete(), 5000);
            }

            // PROSES JOKI - Only role JOKI_ROLE_ID
            if (customId === 'joki_proses') {
                if (!member.roles.cache.has(JOKI_ROLE_ID)) {
                    return interaction.reply({ content: '❌ Hanya staff joki yang bisa memproses!', ephemeral: true });
                }

                const prosesEmbed = new EmbedBuilder()
                    .setTitle('🚀 Joki Sedang Diproses')
                    .setDescription(`${user} sedang dalam proses joki oleh ${user}.\n\nMohon tunggu hingga selesai.`)
                    .setColor('#57F287')
                    .setFooter({ text: 'SysHub Joki Service' })
                    .setTimestamp();

                const closeRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_joki_ticket')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('✖️'),
                    );

                await interaction.update({ embeds: [prosesEmbed], components: [closeRow] });
                await channel.send(`🚀 Joki sedang diproses oleh ${user}. Mohon tunggu hingga selesai.`);
            }

            // === PREMIUM STOCK HANDLERS ===
            if (customId === 'premium_stock_add' || customId === 'premium_stock_delete') {
                if (!member.roles.cache.has(process.env.MIDMAN_STAFF_ID) && user.id !== process.env.MIDMAN_STAFF_ID) {
                    return interaction.reply({ content: '❌ Hanya admin yang bisa mengatur stock!', ephemeral: true });
                }

                const action = customId === 'premium_stock_add' ? 'Tambah' : 'Kurangi';
                const modal = new ModalBuilder()
                    .setCustomId(`premium_stock_${customId === 'premium_stock_add' ? 'add' : 'delete'}_modal`)
                    .setTitle(`${action} Stock Premium`);

                const amountInput = new TextInputBuilder()
                    .setCustomId('stock_amount')
                    .setLabel(`Jumlah ${action === 'Tambah' ? 'penambahan' : 'pengurangan'}`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Masukkan angka (contoh: 5)')
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);
                return interaction.showModal(modal);
            }

            if (customId === 'premium_stock_reset') {
                if (!member.roles.cache.has(process.env.MIDMAN_STAFF_ID) && user.id !== process.env.MIDMAN_STAFF_ID) {
                    return interaction.reply({ content: '❌ Hanya admin yang bisa mengatur stock!', ephemeral: true });
                }

                const stockData = loadStock();
                stockData.currentStock = 0;
                saveStock(stockData);

                const adminEmbed = buildAdminEmbed(stockData);
                const adminRow = buildAdminRow();
                await interaction.update({ embeds: [adminEmbed], components: [adminRow] });
                await updateBothPanels(interaction.client);
                return interaction.followUp({ content: '🔄 Stock telah direset ke **0**.', ephemeral: true });
            }

            if (customId === 'premium_stock_default') {
                if (!member.roles.cache.has(process.env.MIDMAN_STAFF_ID) && user.id !== process.env.MIDMAN_STAFF_ID) {
                    return interaction.reply({ content: '❌ Hanya admin yang bisa mengatur stock!', ephemeral: true });
                }

                const stockData = loadStock();
                stockData.currentStock = stockData.defaultStock;
                saveStock(stockData);

                const adminEmbed = buildAdminEmbed(stockData);
                const adminRow = buildAdminRow();
                await interaction.update({ embeds: [adminEmbed], components: [adminRow] });
                await updateBothPanels(interaction.client);
                return interaction.followUp({ content: `🏠 Stock dikembalikan ke default: **${stockData.defaultStock}** key.`, ephemeral: true });
            }

            // === RULES LANGUAGE HANDLERS ===
            if (customId === 'rules_lang_en' || customId === 'rules_lang_id') {
                const lang = customId === 'rules_lang_en' ? 'en' : 'id';
                const isEn = lang === 'en';

                const rulesEmbed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle(isEn ? 'Server Rules' : 'Peraturan Server')
                    .setThumbnail('attachment://logo.png')
                    .setDescription(
                        isEn
                            ? 'Hello and welcome to the SysHub Discord Server! We want everyone to have fun here, regardless of background or rank, so we\'ve got a few rules you\'ll need to follow:\n\n**1. Respect Everyone**\nTreat others with kindness and respect. No harassment, toxic behavior, or personal attacks.\n\n**2. No Controversial Topics**\nAvoid discussions about politics, religion, or sensitive issues that could create conflicts. Keep the vibe positive!\n\n**3. Zero Tolerance for Hate Speech**\nNo racism, sexism, homophobia, or any form of discrimination. This includes offensive slurs, derogatory language, and targeted hate.\n\n**4. No Spam or Unwanted Promotions**\nAvoid sending excessive messages, emojis, caps, pings, or posting Discord invites and self-promo without permission.\n\n**5. Protect Privacy**\nDo not share your personal information or anyone else\'s (e.g., real name, address, phone number, DMs, or private messages).\n\n**6. Report Issues, Don\'t Handle Them Yourself**\nIf you see someone breaking the rules, report it to the moderators instead of engaging. False reports will result in punishment.\n\n**7. Follow Discord Terms of Service**\nAny violation of Discord\'s ToS is strictly forbidden. If Discord doesn\'t allow it, neither do we.'
                            : 'Halo dan selamat datang di Discord Server SysHub! Kami ingin semua orang bersenang-senang di sini, tanpa memandang latar belakang atau rank, jadi ada beberapa peraturan yang harus kamu ikuti:\n\n**1. Hormati Semua Orang**\nPerlakukan orang lain dengan baik dan hormat. Tidak boleh bullying, perilaku toxic, atau serangan pribadi.\n\n**2. Dilarang Bahas Topik Sensitif**\nHindari diskusi tentang politik, agama, atau isu-isu sensitif yang bisa menimbulkan konflik. Jaga suasana tetap positif!\n\n**3. Toleransi Nol untuk Hate Speech**\nTidak boleh rasisme, seksisme, homofobia, atau bentuk diskriminasi apapun. Ini termasuk kata-kata kasar, bahasa merendahkan, dan kebencian yang ditargetkan.\n\n**4. Dilarang Spam atau Promosi Tidak Diinginkan**\nHindari mengirim pesan berlebihan, emoji, huruf kapital, ping, atau memposting undangan Discord dan self-promo tanpa izin.\n\n**5. Jaga Privasi**\nJangan membagikan informasi pribadi kamu atau orang lain (contoh: nama asli, alamat, nomor telepon, DM, atau pesan pribadi).\n\n**6. Laporkan Masalah, Jangan Selesaikan Sendiri**\nJika kamu melihat seseorang melanggar peraturan, laporkan ke moderator alih-alih terlibat langsung. Laporan palsu akan dikenakan sanksi.\n\n**7. Patuhi Syarat Layanan Discord**\nPelanggaran terhadap ToS Discord sangat dilarang. Jika Discord tidak mengizinkannya, kami juga tidak.'
                    )
                    .setFooter({ text: isEn ? 'SysHub Server Rules' : 'Peraturan Server SysHub', icon_url: 'attachment://logo.png' })
                    .setTimestamp();

                const langRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rules_lang_en').setLabel('English').setStyle(ButtonStyle.Primary).setEmoji('🇬🇧'),
                    new ButtonBuilder().setCustomId('rules_lang_id').setLabel('Indonesia').setStyle(ButtonStyle.Success).setEmoji('🇮🇩'),
                );

                const logoFile = new AttachmentBuilder(path.join(__dirname, '..', 'logo.png'), { name: 'logo.png' });
                return interaction.update({ embeds: [rulesEmbed], components: [langRow], files: [logoFile] });
            }
        }

        // --- HANDLE MODALS ---
        if (interaction.isModalSubmit()) {
            const { customId, guild, user, channel, member } = interaction;
            const logChannel = guild.channels.cache.get(process.env.TICKET_LOG_CHANNEL_ID);
            const staffId = process.env.MIDMAN_STAFF_ID;

            if (customId === 'midman_modal') {
                const jenisMidman = interaction.fields.getTextInputValue('jenis_midman');
                const jumlahHargaStr = interaction.fields.getTextInputValue('jumlah_harga');
                const lawanInputStr = interaction.fields.getTextInputValue('lawan_transaksi');

                // Price parser helper
                const parsePrice = (input) => {
                    if (!input) return 0;
                    let str = input.toLowerCase().trim();
                    str = str.replace(/rp\.?/g, '').trim();
                    
                    let isK = str.includes('k');
                    let isM = str.includes('m');
                    
                    let clean = str.replace(/[^0-9.,]/g, '');
                    
                    if (isK || isM) {
                        clean = clean.replace(/,/g, '.');
                        let val = parseFloat(clean);
                        if (isNaN(val)) return 0;
                        return isM ? Math.round(val * 1000000) : Math.round(val * 1000);
                    } else {
                        clean = clean.replace(/[.,]/g, '');
                        let val = parseInt(clean, 10);
                        return isNaN(val) ? 0 : val;
                    }
                };

                const priceVal = parsePrice(jumlahHargaStr);
                let taxAmount = 0;
                if (priceVal >= 1000000) {
                    taxAmount = Math.round(priceVal * 0.05);
                } else if (priceVal >= 800000) {
                    taxAmount = 25000;
                } else if (priceVal >= 600000) {
                    taxAmount = 20000;
                } else if (priceVal >= 400000) {
                    taxAmount = 15000;
                } else if (priceVal >= 200000) {
                    taxAmount = 10000;
                } else if (priceVal >= 100000) {
                    taxAmount = 5000;
                } else {
                    taxAmount = 2000;
                }
                const totalAmount = priceVal + taxAmount;

                const formatCurrency = (val) => {
                    return `Rp ${val.toLocaleString('id-ID')}`;
                };

                const ticketName = `midman-${user.username}`;
                const existingTicket = guild.channels.cache.find(c => c.name === ticketName.toLowerCase());
                if (existingTicket) {
                    return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                // Try to resolve opponent (second person)
                let secondPerson = null;
                let cleanLawan = lawanInputStr.replace(/[<@!>]/g, '').trim();
                
                if (/^\d+$/.test(cleanLawan)) {
                    try {
                        secondPerson = await guild.members.fetch(cleanLawan);
                    } catch (e) {}
                }

                if (!secondPerson) {
                    secondPerson = guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === lawanInputStr.toLowerCase() ||
                        m.user.tag.toLowerCase() === lawanInputStr.toLowerCase()
                    );
                }

                if (!secondPerson) {
                    try {
                        const searchResults = await guild.members.fetch({ query: lawanInputStr, limit: 1 });
                        secondPerson = searchResults.first();
                    } catch (e) {}
                }

                let lawanInstruction = '';
                let pingContent = `${user} | <@&${staffId}>`;
                
                const permissionOverwrites = [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: staffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ];

                if (secondPerson) {
                    permissionOverwrites.push({
                        id: secondPerson.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                    });
                    lawanInstruction = `✅ **Lawan Transaksi:** ${secondPerson} berhasil ditambahkan ke tiket secara otomatis.`;
                    pingContent = `${user} | ${secondPerson} | <@&${staffId}>`;
                } else {
                    lawanInstruction = `⚠️ **Lawan Transaksi tidak terdeteksi otomatis:** \`${lawanInputStr}\`\n👉 *Silakan tag atau sebutkan username/ID si penjual/pembeli tersebut di sini agar staff dapat menambahkannya.*`;
                }

                try {
                    const ticketChannel = await guild.channels.create({
                        name: ticketName,
                        type: ChannelType.GuildText,
                        parent: JOKI_CATEGORY_ID,
                        permissionOverwrites,
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('🤝 New Midman Ticket')
                        .setColor('#5865F2')
                        .setDescription(`Welcome ${user}!\nPlease describe your transaction details.\n\n${lawanInstruction}\n\n**Staff <@&${staffId}> must claim this ticket first.**`)
                        .addFields(
                            { name: '📋 Form Transaksi', value: `**Jenis Midman:** ${jenisMidman}\n**Jumlah Harga:** ${jumlahHargaStr}\n**Lawan Transaksi:** ${secondPerson ? `${secondPerson} (${secondPerson.user.tag})` : `\`${lawanInputStr}\``}` },
                            { name: '💰 Rincian Biaya (Fee)', value: `**Harga Asli:** ${formatCurrency(priceVal)}\n**Fee Midman:** ${formatCurrency(taxAmount)}\n**Total yang harus dibayar:** ${formatCurrency(totalAmount)}` }
                        )
                        .setFooter({ text: 'SysHub Middleman System' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('✅'),
                        );

                    await ticketChannel.send({ content: pingContent, embeds: [embed], components: [row] });
                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });

                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎫 Ticket Opened')
                            .setColor('#57F287')
                            .addFields(
                                { name: 'User', value: `${user} (${user.id})`, inline: true },
                                { name: 'Channel', value: `${ticketChannel.name}`, inline: true },
                                { name: 'Jenis Midman', value: jenisMidman, inline: true },
                                { name: 'Harga', value: formatCurrency(priceVal), inline: true },
                                { name: 'Fee', value: formatCurrency(taxAmount), inline: true },
                                { name: 'Total', value: formatCurrency(totalAmount), inline: true },
                                { name: 'Lawan Transaksi', value: secondPerson ? `${secondPerson.user.tag} (${secondPerson.id})` : lawanInputStr, inline: true }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    console.error('Failed to create channel:', error);
                    await interaction.editReply({ content: 'Failed to create ticket channel. Please contact an administrator.' });
                }
            }

            // ADD USER MODAL
            if (customId === 'add_user_modal') {
                const userId = interaction.fields.getTextInputValue('user_id_input').replace(/[<@!>]/g, '').trim();

                if (!/^\d+$/.test(userId)) {
                    return interaction.reply({ content: 'ID tidak valid! Masukkan ID Discord yang benar.', ephemeral: true });
                }

                try {
                    const memberToAdd = await guild.members.fetch(userId);

                    await channel.permissionOverwrites.edit(memberToAdd.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true,
                    });

                    const oldEmbed = interaction.message.embeds[0];
                    const embed = new EmbedBuilder()
                        .setTitle(oldEmbed?.title || '🤝 Midman Ticket')
                        .setColor(oldEmbed?.color || '#5865F2')
                        .setDescription(oldEmbed?.description || '')
                        .setTimestamp();

                    if (oldEmbed?.fields) {
                        for (const field of oldEmbed.fields) {
                            embed.addFields({ name: field.name, value: field.value, inline: field.inline });
                        }
                    }

                    embed.addFields({ name: '👤 User Ditambahkan', value: `${memberToAdd} (${memberToAdd.user.tag})`, inline: true });

                    if (oldEmbed?.footer) embed.setFooter({ text: oldEmbed.footer.text });

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('add_midman_user').setLabel('Add User').setStyle(ButtonStyle.Primary).setEmoji('👤'),
                            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                            new ButtonBuilder().setCustomId('cancel_ticket').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('✖️'),
                        );

                    await interaction.update({ embeds: [embed], components: [row] });
                    await channel.send(`${memberToAdd} telah ditambahkan ke ticket oleh staff.`);
                } catch (err) {
                    return interaction.reply({ content: 'Gagal menambahkan user. Pastikan ID benar dan user ada di server.', ephemeral: true });
                }
            }

            // PREMIUM STOCK ADD MODAL
            if (customId === 'premium_stock_add_modal') {
                const amount = parseInt(interaction.fields.getTextInputValue('stock_amount'), 10);
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '❌ Masukkan angka yang valid dan lebih dari 0!', ephemeral: true });
                }

                const stockData = loadStock();
                stockData.currentStock += amount;
                saveStock(stockData);

                await updateBothPanels(interaction.client);

                return interaction.reply({ content: `➕ Stock ditambah **${amount}** key. Total sekarang: **${stockData.currentStock}**`, ephemeral: true });
            }

            // PREMIUM STOCK DELETE MODAL
            if (customId === 'premium_stock_delete_modal') {
                const amount = parseInt(interaction.fields.getTextInputValue('stock_amount'), 10);
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '❌ Masukkan angka yang valid dan lebih dari 0!', ephemeral: true });
                }

                const stockData = loadStock();
                if (amount > stockData.currentStock) {
                    return interaction.reply({ content: `❌ Stock tidak cukup! Stock saat ini: **${stockData.currentStock}**`, ephemeral: true });
                }

                stockData.currentStock -= amount;
                saveStock(stockData);

                await updateBothPanels(interaction.client);

                return interaction.reply({ content: `➖ Stock dikurangi **${amount}** key. Total sekarang: **${stockData.currentStock}**`, ephemeral: true });
            }

            // HIRING MODAL SUBMIT
            if (customId === 'hiring_modal') {
                const namaSosmed = interaction.fields.getTextInputValue('nama_sosmed');
                const linkVideo = interaction.fields.getTextInputValue('link_video');

                const pending = pendingHiring.get(user.id);
                const roleType = pending?.roleType || 'Unknown';
                pendingHiring.delete(user.id);

                const ticketName = `hiring-${user.username}`;
                const existingTicket = guild.channels.cache.find(c => c.name === ticketName.toLowerCase());
                if (existingTicket) {
                    return interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const permissionOverwrites = [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                        { id: HIRING_STAFF_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ];

                    const ticketChannel = await guild.channels.create({
                        name: ticketName,
                        type: ChannelType.GuildText,
                        parent: HIRING_CATEGORY_ID,
                        permissionOverwrites,
                    });

                    const roleEmoji = roleType === 'Streamer' ? '🎥' : '🎬';

                    const embed = new EmbedBuilder()
                        .setTitle(`${roleEmoji} New Hiring Application — ${roleType}`)
                        .setColor(roleType === 'Streamer' ? '#5865F2' : '#57F287')
                        .setDescription(`Welcome ${user}!\n\nBerikut data applying kamu:\n\nStaff <@&${HIRING_STAFF_ID}> akan segera mereview aplikasi kamu.`)
                        .addFields(
                            { name: '📋 Position', value: roleType, inline: true },
                            { name: '👤 Nama Akun Sosmed', value: namaSosmed, inline: false },
                            { name: '🎥 Link Video', value: linkVideo, inline: false },
                        )
                        .setFooter({ text: 'SysHub Hiring System' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('close_hiring_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        );

                    await ticketChannel.send({ content: `${user} | <@&${HIRING_STAFF_ID}>`, embeds: [embed], components: [row] });
                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });

                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🎫 Hiring Application Opened — ${roleType}`)
                            .setColor('#57F287')
                            .addFields(
                                { name: 'User', value: `${user} (${user.id})`, inline: true },
                                { name: 'Channel', value: ticketChannel.name, inline: true },
                                { name: 'Position', value: roleType, inline: true },
                                { name: 'Akun Sosmed', value: namaSosmed, inline: false },
                                { name: 'Link Video', value: linkVideo, inline: false },
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    console.error('Failed to create hiring ticket:', error);
                    await interaction.editReply({ content: 'Failed to create ticket channel. Please contact an administrator.' });
                }
            }

            // VERIFY MODAL SUBMIT
            if (customId === 'verify_modal') {
                const pending = pendingVerifications.get(user.id);
                if (!pending) {
                    return interaction.reply({ content: 'Tidak ada captcha aktif. Klik tombol **Verify** lagi.', ephemeral: true });
                }

                if (Date.now() > pending.expiresAt) {
                    pendingVerifications.delete(user.id);
                    return interaction.reply({ content: 'Captcha sudah expired! Klik tombol **Verify** lagi.', ephemeral: true });
                }

                const inputCode = interaction.fields.getTextInputValue('verify_code_input').trim();

                if (inputCode !== pending.code) {
                    return interaction.reply({ content: `❌ Kode salah! Kamu memasukkan: **${inputCode}**`, ephemeral: true });
                }

                pendingVerifications.delete(user.id);

                try {
                    await member.roles.add(VERIFY_ROLE);
                    return interaction.reply({ content: '✅ Verifikasi berhasil! Kamu sekarang memiliki akses ke server.', ephemeral: true });
                } catch (err) {
                    console.error('[VERIFY] Failed to add role:', err.message);
                    return interaction.reply({ content: 'Gagal memberikan role. Hubungi admin.', ephemeral: true });
                }
            }
        }
    },
};
