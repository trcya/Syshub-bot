const { PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const path = require('path');

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

        const logoPath = path.join(__dirname, '..', 'logo.png');
        const logoAttachment = new AttachmentBuilder(logoPath, { name: 'logo.png' });

        const payload = {
            flags: 32768,
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 13,
                            media: {
                                url: 'attachment://logo.png'
                            }
                        },
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

        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(payload));
        formData.append('files[0]', logoAttachment.attachment, 'logo.png');

        const res = await fetch(`https://discord.com/api/v10/channels/${VERIFY_CHANNEL}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${message.client.token}`,
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('[VERIFY] Failed to send panel:', err);
            return message.reply('Gagal mengirim panel verifikasi. Silakan coba lagi.');
        }

        await message.reply(`Panel verifikasi berhasil dikirim ke <#${VERIFY_CHANNEL}>!`);
    },
};
