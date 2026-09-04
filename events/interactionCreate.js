const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getEmbed, getButtons } = require('../utils/welcomeEmbed');

const JOKI_TICKET_LOG_CHANNEL = '1545265772731957388';
const JOKI_CATEGORY_ID = '1545263915158478898';
const JOKI_ROLE_ID = '1498652010977824919';

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

            // === JOKI TICKET HANDLERS ===

            // 5. JOKI TREADMILL / TREADMILL+EGG BUTTON - Create ticket
            if (customId === 'joki_treadmill' || customId === 'joki_treadmill_egg') {
                const isEgg = customId === 'joki_treadmill_egg';
                const serviceType = isEgg ? 'Treadmill + Steal Egg' : 'Treadmill Only';
                const serviceEmoji = isEgg ? '🥚' : '🏃';

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
                        .setDescription(`Welcome ${user}!\nStaff akan segera membantu kamu.\n\nPilih durasi yang kamu inginkan:`)
                        .setFooter({ text: 'SysHub Joki Service' })
                        .setTimestamp();

                    const tBtns1 = [
                        { id: 'joki_dur_6j',  label: '6 Jam — 7K' },
                        { id: 'joki_dur_12j', label: '12 Jam — 10K' },
                        { id: 'joki_dur_1h',  label: '1 Hari — 15K' },
                        { id: 'joki_dur_2h',  label: '2 Hari — 25K' },
                        { id: 'joki_dur_3h',  label: '3 Hari — 35K' },
                    ];
                    const tBtns2 = [
                        { id: 'joki_dur_5h',  label: '5 Hari — 50K' },
                        { id: 'joki_dur_7h',  label: '7 Hari — 65K' },
                        { id: 'joki_dur_14h', label: '14 Hari — 120K' },
                        { id: 'joki_dur_21h', label: '21 Hari — 170K' },
                        { id: 'joki_dur_30h', label: '30 Hari — 220K' },
                    ];
                    const eBtns1 = [
                        { id: 'joki_dur_egg_6j',  label: '6 Jam — 14K' },
                        { id: 'joki_dur_egg_12j', label: '12 Jam — 22K' },
                        { id: 'joki_dur_egg_1h',  label: '1 Hari — 35K' },
                        { id: 'joki_dur_egg_2h',  label: '2 Hari — 60K' },
                        { id: 'joki_dur_egg_3h',  label: '3 Hari — 85K' },
                    ];
                    const eBtns2 = [
                        { id: 'joki_dur_egg_5h',  label: '5 Hari — 130K' },
                        { id: 'joki_dur_egg_7h',  label: '7 Hari — 170K' },
                        { id: 'joki_dur_egg_14h', label: '14 Hari — 300K' },
                        { id: 'joki_dur_egg_21h', label: '21 Hari — 400K' },
                        { id: 'joki_dur_egg_30h', label: '30 Hari — 500K' },
                    ];

                    const btns = isEgg ? [eBtns1, eBtns2] : [tBtns1, tBtns2];
                    const rows = btns.map(pair => {
                        return new ActionRowBuilder().addComponents(
                            pair.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(isEgg ? ButtonStyle.Success : ButtonStyle.Primary))
                        );
                    });

                    await ticketChannel.send({ content: `${user} | <@&${JOKI_ROLE_ID}>`, embeds: [preEmbed], components: rows });
                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });

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
                    'joki_dur_6j':       { label: '6 Jam', price: 7000 },
                    'joki_dur_12j':      { label: '12 Jam', price: 10000 },
                    'joki_dur_1h':       { label: '1 Hari', price: 15000 },
                    'joki_dur_2h':       { label: '2 Hari', price: 25000 },
                    'joki_dur_3h':       { label: '3 Hari', price: 35000 },
                    'joki_dur_5h':       { label: '5 Hari', price: 50000 },
                    'joki_dur_7h':       { label: '7 Hari', price: 65000 },
                    'joki_dur_14h':      { label: '14 Hari', price: 120000 },
                    'joki_dur_21h':      { label: '21 Hari', price: 170000 },
                    'joki_dur_30h':      { label: '30 Hari', price: 220000 },
                    'joki_dur_egg_6j':   { label: '6 Jam', price: 14000 },
                    'joki_dur_egg_12j':  { label: '12 Jam', price: 22000 },
                    'joki_dur_egg_1h':   { label: '1 Hari', price: 35000 },
                    'joki_dur_egg_2h':   { label: '2 Hari', price: 60000 },
                    'joki_dur_egg_3h':   { label: '3 Hari', price: 85000 },
                    'joki_dur_egg_5h':   { label: '5 Hari', price: 130000 },
                    'joki_dur_egg_7h':   { label: '7 Hari', price: 170000 },
                    'joki_dur_egg_14h':  { label: '14 Hari', price: 300000 },
                    'joki_dur_egg_21h':  { label: '21 Hari', price: 400000 },
                    'joki_dur_egg_30h':  { label: '30 Hari', price: 500000 },
                };

                const opt = jokiDurMap[customId];
                if (!opt) return;

                const formatPrice = (v) => 'Rp ' + v.toLocaleString('id-ID');
                const isEgg = customId.includes('egg');
                const serviceType = isEgg ? '🥚 Treadmill + Steal Egg' : '🏃 Treadmill Only';
                const color = isEgg ? '#57F287' : '#5865F2';

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
            }

            // 7. CLOSE JOKI TICKET - Transcript + Delete
            if (customId === 'close_joki_ticket') {
                if (!member.roles.cache.has(staffId) && user.id !== staffId) {
                    return interaction.reply({ content: 'Only staff can close tickets!', ephemeral: true });
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
        }
    },
};
