const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages
    ]
});

// Bug report storage
const bugReports = new Map();
const BUG_CHANNEL_ID = '1443929342492282920';

client.once('ready', () => {
    console.log(`✅ Bug Report Bot is online as ${client.user.tag}`);
});

// Handle bug report command
client.on('messageCreate', async (message) => {
    if (message.content === '!bug' && message.author.bot === false) {
        console.log(`🐛 Bug command received from ${message.author.tag}`);
        
        const embed = new EmbedBuilder()
            .setTitle('🐛 Report a Bug')
            .setDescription('Click the button below to report a bug. You will need to provide:\n\n• Your Discord Username\n• Detailed bug description')
            .setColor(0xFF0000)
            .setFooter({ text: 'Bug Report System' });

        const reportButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('report_bug')
                .setLabel('Report Bug')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🐛')
        );

        await message.channel.send({
            embeds: [embed],
            components: [reportButton]
        });
    }

    // Bug management commands
    if (message.content.startsWith('/') && message.author.bot === false) {
        const args = message.content.slice(1).split(' ');
        const command = args[0].toLowerCase();

        // Bug fix confirmation
        if (command === 'bugfix') {
            if (args.length < 2) {
                return message.reply('❌ Usage: /bugfix <bug_id>');
            }
            
            const bugId = args[1];
            const bug = bugReports.get(bugId);
            
            if (!bug) {
                return message.reply('❌ Bug ID not found!');
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Bug Fixed')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Reported By', value: bug.username, inline: true },
                    { name: 'Status', value: '✅ FIXED', inline: true }
                )
                .setFooter({ text: 'Bug Report System' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
            
            // Send DM to user
            try {
                const user = await client.users.fetch(bug.userId);
                await user.send({
                    content: `🎉 **Your bug has been fixed!**\n\n**Bug ID:** ${bugId}\n**Status:** ✅ Fixed\n\nThank you for reporting!`
                });
            } catch (error) {
                console.log('Could not send DM to user');
            }

            bugReports.delete(bugId);
        }

        // Bug not fixed
        if (command === 'bugnotfix') {
            if (args.length < 2) {
                return message.reply('❌ Usage: /bugnotfix <bug_id>');
            }
            
            const bugId = args[1];
            const bug = bugReports.get(bugId);
            
            if (!bug) {
                return message.reply('❌ Bug ID not found!');
            }

            const embed = new EmbedBuilder()
                .setTitle('❌ Bug Not Fixed')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Reported By', value: bug.username, inline: true },
                    { name: 'Status', value: '❌ NOT FIXED', inline: true }
                )
                .setFooter({ text: 'Bug Report System' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        }

        // Dismiss bug
        if (command === 'bugdismiss') {
            if (args.length < 2) {
                return message.reply('❌ Usage: /bugdismiss <bug_id>');
            }
            
            const bugId = args[1];
            const bug = bugReports.get(bugId);
            
            if (!bug) {
                return message.reply('❌ Bug ID not found!');
            }

            // Send DM to user
            try {
                const user = await client.users.fetch(bug.userId);
                await user.send({
                    content: `📋 **Your bug report has been dismissed**\n\n**Bug ID:** ${bugId}\n**Status:** ❌ Dismissed\n\nIf you think this was a mistake, please report again.`
                });
            } catch (error) {
                console.log('Could not send DM to user');
            }

            bugReports.delete(bugId);
            await message.reply(`✅ Bug ${bugId} has been dismissed and removed.`);
        }

        // List pending bugs
        if (command === 'buglist') {
            if (bugReports.size === 0) {
                return message.reply('📝 No pending bugs found.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🐛 Pending Bug Reports')
                .setColor(0xFFFF00)
                .setDescription(`Total pending bugs: ${bugReports.size}`);

            let bugList = '';
            for (const [bugId, bug] of bugReports) {
                bugList += `**ID:** ${bugId} | **By:** ${bug.username} | **Time:** <t:${Math.floor(bug.timestamp / 1000)}:R>\n`;
            }

            embed.addFields({ name: 'Bugs', value: bugList || 'No bugs' });

            await message.channel.send({ embeds: [embed] });
        }
    }
});

// Handle bug report button click
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'report_bug') {
        // Create bug report modal
        const modal = new ModalBuilder()
            .setCustomId('bug_report_modal')
            .setTitle('Report a Bug');

        // Discord Username Input
        const usernameInput = new TextInputBuilder()
            .setCustomId('discord_username')
            .setLabel('Your Discord Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your exact Discord username')
            .setRequired(true)
            .setMaxLength(32);

        // Bug Description Input
        const bugDescriptionInput = new TextInputBuilder()
            .setCustomId('bug_description')
            .setLabel('Bug Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe the bug in detail...')
            .setRequired(true)
            .setMaxLength(1000);

        const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(bugDescriptionInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    }
});

// Handle bug report modal submission
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'bug_report_modal') {
        const discordUsername = interaction.fields.getTextInputValue('discord_username');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');

        // Generate unique bug ID
        const bugId = generateBugId();
        const timestamp = Date.now();

        // Store bug report
        bugReports.set(bugId, {
            username: discordUsername,
            description: bugDescription,
            userId: interaction.user.id,
            timestamp: timestamp
        });

        console.log(`✅ New bug reported: ${bugId} by ${discordUsername}`);

        // Send confirmation to user
        const userEmbed = new EmbedBuilder()
            .setTitle('✅ Bug Report Submitted')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Bug ID', value: bugId, inline: true },
                { name: 'Username', value: discordUsername, inline: true },
                { name: 'Description', value: bugDescription.length > 500 ? bugDescription.substring(0, 500) + '...' : bugDescription, inline: false }
            )
            .setFooter({ text: 'We will review your bug report soon' })
            .setTimestamp();

        await interaction.reply({
            embeds: [userEmbed],
            ephemeral: true
        });

        // Send to bug channel with copyable ID
        const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
        if (bugChannel) {
            const bugEmbed = new EmbedBuilder()
                .setTitle('🐛 New Bug Report')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Bug ID', value: `\`${bugId}\``, inline: true },
                    { name: 'Discord Username', value: discordUsername, inline: true },
                    { name: 'User ID', value: interaction.user.id, inline: true },
                    { name: 'Bug Description', value: bugDescription, inline: false }
                )
                .setFooter({ text: `Use /bugfix ${bugId} to mark as fixed` })
                .setTimestamp();

            const copyButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`copy_${bugId}`)
                    .setLabel('Copy Bug ID')
                    .setStyle(ButtonStyle.Second)
                    .setEmoji('📋')
            );

            await bugChannel.send({ 
                content: `📢 **NEW BUG REPORT** - Bug ID: \`${bugId}\``,
                embeds: [bugEmbed],
                components: [copyButton]
            });
        }
    }

    // Handle copy button
    if (interaction.isButton() && interaction.customId.startsWith('copy_')) {
        const bugId = interaction.customId.replace('copy_', '');
        
        await interaction.reply({
            content: `📋 Bug ID copied: \`${bugId}\`\nUse this ID with commands like:\n\`/bugfix ${bugId}\`\n\`/bugnotfix ${bugId}\`\n\`/bugdismiss ${bugId}\``,
            ephemeral: true
        });
    }
});

// Generate unique bug ID
function generateBugId() {
    return 'BUG_' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Error handling
client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Bot login
client.login(process.env.DISCORD_TOKEN);
