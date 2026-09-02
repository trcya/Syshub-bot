const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'live-monitor.json');

function readDb() {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify([]));
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('Gagal membaca database monitor:', e);
        return [];
    }
}

function writeDb(data) {
    try {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Gagal menulis ke database monitor:', e);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('Mengelola pemantauan live stream YouTube/TikTok dan unggahan video/Shorts')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addSubcommand(sub =>
            sub.setName('add').setDescription('Mendaftarkan akun pemantauan baru')
                .addStringOption(opt => opt.setName('platform').setDescription('Pilih platform').setRequired(true).addChoices(
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'TikTok', value: 'tiktok' }
                ))
                .addStringOption(opt => opt.setName('handle').setDescription('Username TikTok (tanpa @) atau handle YouTube (dengan @)').setRequired(true))
                .addStringOption(opt => opt.setName('content_type').setDescription('Tipe konten yang dipantau').setRequired(true).addChoices(
                    { name: '🔴 Live Stream', value: 'live' },
                    { name: '🎬 Video Upload', value: 'videos' },
                    { name: '⚡ Shorts (YouTube only)', value: 'shorts' }
                ))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel Discord untuk notifikasi').setRequired(true).addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub =>
            sub.setName('remove').setDescription('Menghapus pemantauan akun')
                .addStringOption(opt => opt.setName('platform').setDescription('Pilih platform').setRequired(true).addChoices(
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'TikTok', value: 'tiktok' }
                ))
                .addStringOption(opt => opt.setName('handle').setDescription('Username atau handle yang ingin dihapus').setRequired(true))
                .addStringOption(opt => opt.setName('content_type').setDescription('Tipe konten').setRequired(true).addChoices(
                    { name: '🔴 Live Stream', value: 'live' },
                    { name: '🎬 Video Upload', value: 'videos' },
                    { name: '⚡ Shorts (YouTube only)', value: 'shorts' }
                ))
        )
        .addSubcommand(sub =>
            sub.setName('list').setDescription('Menampilkan semua akun yang dipantau')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const db = readDb();

        if (subcommand === 'add') {
            const platform = interaction.options.getString('platform');
            let handle = interaction.options.getString('handle').trim();
            const contentType = interaction.options.getString('content_type');
            const channel = interaction.options.getChannel('channel');

            if (platform === 'youtube' && !handle.startsWith('@')) handle = '@' + handle;

            const exists = db.find(item =>
                item.platform === platform &&
                item.handle.toLowerCase() === handle.toLowerCase() &&
                item.contentType === contentType &&
                item.guildId === interaction.guildId
            );

            if (exists) {
                return interaction.reply({ content: `Akun **${handle}** (${platform} - ${contentType}) sudah dipantau di channel <#${exists.discordChannelId}>!`, ephemeral: true });
            }

            db.push({ platform, handle, contentType, discordChannelId: channel.id, guildId: interaction.guildId, lastStreamId: null, offlineCount: 0 });
            writeDb(db);
            return interaction.reply({ content: `Berhasil mendaftarkan pemantauan **${handle}** (${platform} - ${contentType}) ke channel <#${channel.id}>!`, ephemeral: true });

        } else if (subcommand === 'remove') {
            const platform = interaction.options.getString('platform');
            let handle = interaction.options.getString('handle').trim();
            const contentType = interaction.options.getString('content_type');

            if (platform === 'youtube' && !handle.startsWith('@')) handle = '@' + handle;

            const initialLength = db.length;
            const filteredDb = db.filter(item =>
                !(item.platform === platform && item.handle.toLowerCase() === handle.toLowerCase() && item.contentType === contentType && item.guildId === interaction.guildId)
            );

            if (filteredDb.length === initialLength) {
                return interaction.reply({ content: `Akun **${handle}** (${platform} - ${contentType}) tidak ditemukan.`, ephemeral: true });
            }

            writeDb(filteredDb);
            return interaction.reply({ content: `Berhasil menghapus pemantauan untuk **${handle}** (${platform} - ${contentType}).`, ephemeral: true });

        } else if (subcommand === 'list') {
            const serverMonitors = db.filter(item => item.guildId === interaction.guildId);
            if (serverMonitors.length === 0) {
                return interaction.reply({ content: 'Belum ada akun yang dipantau. Gunakan `/monitor add` untuk memulai!', ephemeral: true });
            }

            const embed = new EmbedBuilder().setTitle('Daftar Akun yang Dipantau').setColor(0x00A2E8).setTimestamp();
            let youtubeList = '', tiktokList = '';

            serverMonitors.forEach(item => {
                const line = `• **${item.handle}** [${item.contentType || 'live'}] -> <#${item.discordChannelId}>\n`;
                if (item.platform === 'youtube') youtubeList += line;
                else if (item.platform === 'tiktok') tiktokList += line;
            });

            embed.addFields(
                { name: 'YouTube', value: youtubeList || 'Tidak ada', inline: false },
                { name: 'TikTok', value: tiktokList || 'Tidak ada', inline: false }
            );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
