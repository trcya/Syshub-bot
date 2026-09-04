const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const { getEmbed, getButtons } = require('../utils/welcomeEmbed');

const JOKI_TICKET_LOG_CHANNEL = '1545265772731957388';
const JOKI_CATEGORY_ID = '1545263915158478898';

const JOKI_PRICING = {
    treadmill: {
        label: '🏃 Treadmill Only',
        options: [
            { label: '1 Jam', value: 'treadmill_1j', price: 2000 },
            { label: '3 Jam', value: 'treadmill_3j', price: 5000 },
            { label: '6 Jam', value: 'treadmill_6j', price: 10000 },
            { label: '12 Jam', value: 'treadmill_12j', price: 18000 },
            { label: '1 Hari', value: 'treadmill_1h', price: 30000 },
            { label: '2 Hari', value: 'treadmill_2h', price: 55000 },
            { label: '3 Hari', value: 'treadmill_3h', price: 75000 },
            { label: '5 Hari', value: 'treadmill_5h', price: 115000 },
            { label: '7 Hari', value: 'treadmill_7h', price: 150000 },
            { label: '14 Hari', value: 'treadmill_14h', price: 280000 },
            { label: '21 Hari', value: 'treadmill_21h', price: 390000 },
            { label: '30 Hari', value: 'treadmill_30h', price: 500000 },
        ]
    },
    treadmill_egg: {
        label: '🥚 Treadmill + Steal Egg',
        options: [
            { label: '1 Jam', value: 'egg_1j', price: 5000 },
            { label: '3 Jam', value: 'egg_3j', price: 14000 },
            { label: '6 Jam', value: 'egg_6j', price: 25000 },
            { label: '12 Jam', value: 'egg_12j', price: 45000 },
            { label: '1 Hari', value: 'egg_1h', price: 80000 },
            { label: '2 Hari', value: 'egg_2h', price: 150000 },
            { label: '3 Hari', value: 'egg_3h', price: 220000 },
            { label: '5 Hari', value: 'egg_5h', price: 330000 },
            { label: '7 Hari', value: 'egg_7h', price: 450000 },
            { label: '14 Hari', value: 'egg_14h', price: 850000 },
            { label: '21 Hari', value: 'egg_21h', price: 1150000 },
            { label: '30 Hari', value: 'egg_30h', price: 1500000 },
        ]
    }
};

function findJokiOption(value) {
    for (const key of Object.keys(JOKI_PRICING)) {
        const found = JOKI_PRICING[key].options.find(o => o.value === value);
        if (found) return { ...found, category: JOKI_PRICING[key].label };
    }
    return null;
}

function formatPrice(val) {
    return 'Rp ' + val.toLocaleString('id-ID');
}

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
                
                const claimEmbed = new EmbedBuilder()
                    .setTitle('📌 Ticket Claimed')
                    .setColor('#FEE75C')
                    .setDescription(`This ticket has been claimed by ${user}.\nStaff will assist you now.`)
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('cancel_ticket').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('✖️'),
                    );

                await interaction.update({ embeds: [claimEmbed], components: [row] });

                if (logChannel) {
                    const logEmbed = new EmbedBuilder().setTitle('📌 Ticket Claimed').setColor('#FEE75C').addFields({ name: 'Staff', value: `${user} (${user.id})`, inline: true }, { name: 'Channel', value: `${channel.name}`, inline: true }).setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }
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

            // 5. JOKI TREADMILL BUTTON - Show dropdown
            if (customId === 'joki_treadmill' || customId === 'joki_treadmill_egg') {
                const type = customId === 'joki_treadmill' ? 'treadmill' : 'treadmill_egg';
                const pricing = JOKI_PRICING[type];

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`joki_select_${type}`)
                    .setPlaceholder(`Pilih durasi ${pricing.label}...`)
                    .addOptions(
                        pricing.options.map(opt => ({
                            label: `${opt.label} — ${formatPrice(opt.price)}`,
                            value: opt.value,
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.reply({
                    content: `Pilih durasi **${pricing.label}** yang kamu inginkan:`,
                    components: [row],
                    ephemeral: true
                });
            }

            // 6. JOKI SELECT MENU - Create ticket channel
            if (customId.startsWith('joki_select_')) {
                const type = customId.replace('joki_select_', '');
                const selectedValue = interaction.values[0];
                const option = findJokiOption(selectedValue);
                if (!option) return interaction.reply({ content: 'Invalid option!', ephemeral: true });

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

                    const embed = new EmbedBuilder()
                        .setTitle('🤖 New Joki Ticket')
                        .setColor('#5865F2')
                        .setDescription(`Welcome ${user}!\nStaff akan segera membantu kamu.`)
                        .addFields(
                            { name: '📋 Layanan', value: option.category, inline: true },
                            { name: '⏱️ Durasi', value: option.label, inline: true },
                            { name: '💰 Total Harga', value: `**${formatPrice(option.price)}**`, inline: true },
                        )
                        .setFooter({ text: 'SysHub Joki Service' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('close_joki_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        );

                    await ticketChannel.send({ content: `${user} | <@&${staffId}>`, embeds: [embed], components: [row] });
                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });

                    const jokiLogChannel = guild.channels.cache.get(JOKI_TICKET_LOG_CHANNEL);
                    if (jokiLogChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎫 Joki Ticket Opened')
                            .setColor('#57F287')
                            .addFields(
                                { name: 'User', value: `${user} (${user.id})`, inline: true },
                                { name: 'Channel', value: ticketChannel.name, inline: true },
                                { name: 'Layanan', value: option.category, inline: true },
                                { name: 'Durasi', value: option.label, inline: true },
                                { name: 'Total', value: formatPrice(option.price), inline: true },
                            )
                            .setTimestamp();
                        jokiLogChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    console.error('Failed to create joki ticket:', error);
                    await interaction.editReply({ content: 'Failed to create ticket channel. Please contact an administrator.' });
                }
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
                const taxPercentage = priceVal < 200000 ? 10 : 5;
                const taxAmount = Math.round(priceVal * (taxPercentage / 100));
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
                        permissionOverwrites,
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('🤝 New Midman Ticket')
                        .setColor('#5865F2')
                        .setDescription(`Welcome ${user}!\nPlease describe your transaction details.\n\n${lawanInstruction}\n\n**Staff <@&${staffId}> must claim this ticket first.**`)
                        .addFields(
                            { name: '📋 Form Transaksi', value: `**Jenis Midman:** ${jenisMidman}\n**Jumlah Harga:** ${jumlahHargaStr}\n**Lawan Transaksi:** ${secondPerson ? `${secondPerson} (${secondPerson.user.tag})` : `\`${lawanInputStr}\``}` },
                            { name: '💰 Rincian Biaya (Tax)', value: `**Harga Asli:** ${formatCurrency(priceVal)}\n**Pajak Midman (${taxPercentage}%):** ${formatCurrency(taxAmount)}\n**Total yang harus dibayar:** ${formatCurrency(totalAmount)}` }
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
                                { name: 'Pajak', value: `${formatCurrency(taxAmount)} (${taxPercentage}%)`, inline: true },
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
        }
    },
};
