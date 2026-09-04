const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'List all commands',
    execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Bot Help Menu')
            .setColor('#2F3136')
            .setDescription('Berikut adalah command yang tersedia.')
            .addFields(
                { name: 'Prefix', value: '`!`', inline: false },
                { name: 'Prefix Commands', value: [
                    '`!help` — Tampilkan menu ini',
                    '`!setup-joki` — Kirim panel Joki AFK',
                ].join('\n'), inline: false },
                { name: 'Slash Commands', value: [
                    '`/ping` — Cek latensi bot',
                    '`/gstart` — Mulai giveaway',
                    '`/greroll` — Reroll giveaway',
                    '`/setup-midman` — Kirim panel Midman',
                    '`/monitor add` — Tambah akun monitoring',
                    '`/monitor remove` — Hapus akun monitoring',
                    '`/monitor list` — Lihat daftar monitoring',
                    '`/executor-status` — Update status executor',
                ].join('\n'), inline: false },
            )
            .setFooter({ text: 'SysHub Bot - Advanced Edition' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};
