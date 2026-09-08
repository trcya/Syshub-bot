const { PermissionFlagsBits } = require('discord.js');

const VERIFY_CHANNEL = '1546462500273262663';

module.exports = {
    name: 'verify',
    description: 'Kirim panel verifikasi ke channel',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Kamu tidak punya izin untuk menggunakan command ini!');
        }

        const channel = await message.guild.channels.fetch(VERIFY_CHANNEL);
        if (!channel) {
            return message.reply('Channel verifikasi tidak ditemukan!');
        }

        const container = {
            flags: 32768,
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: '## Verify yourself'
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 10,
                            content: 'Click the button below and solve the short captcha to unlock the server.'
                        },
                        {
                            type: 14,
                            divider: true,
                            spacing: 1
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    custom_id: 'verify_start',
                                    label: 'Verify',
                                    style: 3
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        await channel.send(container);
        await message.reply(`Panel verifikasi berhasil dikirim ke <#${VERIFY_CHANNEL}>!`);
    },
};
