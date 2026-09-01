const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'logo.png');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-payment')
        .setDescription('Send the Payment / Purchase Panel')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the panel to (defaults to current channel)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        const embed = new EmbedBuilder()
            .setColor('#2F3136')
            .setAuthor({
                name: 'SysHub',
                icon_url: 'attachment://logo.png'
            })
            .setTitle('❤️ Support SysHub / Donation')
            .setDescription(
                'Support our development and keep the servers running by donating. Your contributions help us maintain and improve our services!'
            )
            .setThumbnail('attachment://logo.png')
            .addFields(
                {
                    name: 'Why Support Us?',
                    value: '• Helps cover server hosting and maintenance costs\n• Direct support for future updates and new features\n• Keeps SysHub active and reliable'
                },
                {
                    name: 'How to Donate:',
                    value: 'Click the **Support Us via SociaBuzz** button below to donate using E-Wallet, QRIS, or Bank Transfer.'
                }
            )
            .setFooter({
                text: 'SysHub Donation System',
                icon_url: 'attachment://logo.png'
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Support Us via SociaBuzz')
                    .setURL('https://sociabuzz.com/syshub/give')
                    .setEmoji('❤️')
                    .setStyle(ButtonStyle.Link),
            );

        const logoFile = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
        await channel.send({ embeds: [embed], components: [row], files: [logoFile] });
        await interaction.reply({ content: `Donation Panel has been sent to ${channel}!`, ephemeral: true });
    },
};
