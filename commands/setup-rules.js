const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

function buildRulesEmbed(lang = 'en') {
    const isEn = lang === 'en';

    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(isEn ? 'Server Rules' : 'Peraturan Server')
        .setThumbnail('attachment://logo.png');

    if (isEn) {
        embed.setDescription(
            'Hello and welcome to the SysHub Discord Server! We want everyone to have fun here, regardless of background or rank, so we\'ve got a few rules you\'ll need to follow:\n\n' +
            '**1. Respect Everyone**\n' +
            'Treat others with kindness and respect. No harassment, toxic behavior, or personal attacks.\n\n' +
            '**2. No Controversial Topics**\n' +
            'Avoid discussions about politics, religion, or sensitive issues that could create conflicts. Keep the vibe positive!\n\n' +
            '**3. Zero Tolerance for Hate Speech**\n' +
            'No racism, sexism, homophobia, or any form of discrimination. This includes offensive slurs, derogatory language, and targeted hate.\n\n' +
            '**4. No Spam or Unwanted Promotions**\n' +
            'Avoid sending excessive messages, emojis, caps, pings, or posting Discord invites and self-promo without permission.\n\n' +
            '**5. Protect Privacy**\n' +
            'Do not share your personal information or anyone else\'s (e.g., real name, address, phone number, DMs, or private messages).\n\n' +
            '**6. Report Issues, Don\'t Handle Them Yourself**\n' +
            'If you see someone breaking the rules, report it to the moderators instead of engaging. False reports will result in punishment.\n\n' +
            '**7. Follow Discord Terms of Service**\n' +
            'Any violation of Discord\'s ToS is strictly forbidden. If Discord doesn\'t allow it, neither do we.'
        );
    } else {
        embed.setDescription(
            'Halo dan selamat datang di Discord Server SysHub! Kami ingin semua orang bersenang-senang di sini, tanpa memandang latar belakang atau rank, jadi ada beberapa peraturan yang harus kamu ikuti:\n\n' +
            '**1. Hormati Semua Orang**\n' +
            'Perlakukan orang lain dengan baik dan hormat. Tidak boleh bullying, perilaku toxic, atau serangan pribadi.\n\n' +
            '**2. Dilarang Bahas Topik Sensitif**\n' +
            'Hindari diskusi tentang politik, agama, atau isu-isu sensitif yang bisa menimbulkan konflik. Jaga suasana tetap positif!\n\n' +
            '**3. Toleransi Nol untuk Hate Speech**\n' +
            'Tidak boleh rasisme, seksisme, homofobia, atau bentuk diskriminasi apapun. Ini termasuk kata-kata kasar, bahasa merendahkan, dan kebencian yang ditargetkan.\n\n' +
            '**4. Dilarang Spam atau Promosi Tidak Diinginkan**\n' +
            'Hindari mengirim pesan berlebihan, emoji, huruf kapital, ping, atau memposting undangan Discord dan self-promo tanpa izin.\n\n' +
            '**5. Jaga Privasi**\n' +
            'Jangan membagikan informasi pribadi kamu atau orang lain (contoh: nama asli, alamat, nomor telepon, DM, atau pesan pribadi).\n\n' +
            '**6. Laporkan Masalah, Jangan Selesaikan Sendiri**\n' +
            'Jika kamu melihat seseorang melanggar peraturan, laporkan ke moderator alih-alih terlibat langsung. Laporan palsu akan dikenakan sanksi.\n\n' +
            '**7. Patuhi Syarat Layanan Discord**\n' +
            'Pelanggaran terhadap ToS Discord sangat dilarang. Jika Discord tidak mengizinkannya, kami juga tidak.'
        );
    }

    embed.setFooter({
        text: isEn ? 'SysHub Server Rules' : 'Peraturan Server SysHub',
        icon_url: 'attachment://logo.png'
    }).setTimestamp();

    return embed;
}

function buildLangRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rules_lang_en')
                .setLabel('English')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🇬🇧'),
            new ButtonBuilder()
                .setCustomId('rules_lang_id')
                .setLabel('Indonesia')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🇮🇩'),
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-rules')
        .setDescription('Deploy the Server Rules Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetChannelId = process.env.RULES_CHANNEL_ID;
        let targetChannel;
        try {
            targetChannel = await interaction.client.channels.fetch(targetChannelId);
        } catch { targetChannel = null; }

        if (!targetChannel) {
            return interaction.editReply({ content: 'Channel rules tidak ditemukan!' });
        }

        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
        const embed = buildRulesEmbed('en');
        const row = buildLangRow();

        await targetChannel.send({ embeds: [embed], components: [row], files: [logoFile] });

        await interaction.editReply({ content: `✅ Rules panel deployed to ${targetChannel}` });
    },
    buildRulesEmbed,
    buildLangRow,
};
