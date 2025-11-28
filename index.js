const { Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

// Bug report storage
const bugReports = new Map();
const BUG_CHANNEL_ID = '1443929342492282920';

client.once('ready', () => {
    console.log(`✅ Bug Report Bot is online as ${client.user.tag}`);
    console.log(`📋 Bug Channel ID: ${BUG_CHANNEL_ID}`);
    
    // Check channel access
    const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
    if (bugChannel) {
        console.log(`✅ Bug channel found: ${bugChannel.name}`);
    } else {
        console.log(`❌ Bug channel NOT found! Check ID: ${BUG_CHANNEL_ID}`);
    }
});

// Handle bug report command
client.on('messageCreate', async (message) => {
    if (message.content === '!bug' && !message.author.bot) {
        console.log(`🐛 Bug command from ${message.author.tag} in #${message.channel.name}`);
        
        const embed = new EmbedBuilder()
            .setTitle('🐛 Report a Bug')
            .setDescription('Click the button below to report a bug.')
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
});

// Handle bug report button click
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'report_bug') {
        console.log(`🔘 Bug report button clicked by ${interaction.user.tag}`);
        
        const modal = new ModalBuilder()
            .setCustomId('bug_report_modal')
            .setTitle('Report a Bug');

        const usernameInput = new TextInputBuilder()
            .setCustomId('discord_username')
            .setLabel('Your Discord Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your Discord username')
            .setRequired(true)
            .setMaxLength(32);

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

// Handle bug report modal submission - UPDATED VERSION
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'bug_report_modal') {
        console.log(`📄 Modal submitted by ${interaction.user.tag}`);
        
        const discordUsername = interaction.fields.getTextInputValue('discord_username');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');

        // Generate unique bug ID
        const bugId = 'BUG_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now();

        // Store bug report
        bugReports.set(bugId, {
            username: discordUsername,
            description: bugDescription,
            userId: interaction.user.id,
            timestamp: timestamp
        });

        console.log(`✅ Bug stored: ${bugId} by ${discordUsername}`);

        // Send confirmation to user
        const userEmbed = new EmbedBuilder()
            .setTitle('✅ Bug Report Submitted!')
            .setColor(0x00FF00)
            .addFields(
                { name: 'Bug ID', value: bugId, inline: true },
                { name: 'Username', value: discordUsername, inline: true }
            )
            .setFooter({ text: 'We will review your report soon' })
            .setTimestamp();

        await interaction.reply({
            embeds: [userEmbed],
            ephemeral: true
        });

        // ✅ UPDATED: Send to bug channel with @everyone mention
        try {
            console.log(`📤 Attempting to send to channel: ${BUG_CHANNEL_ID}`);
            
            const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
            
            if (!bugChannel) {
                console.log(`❌ Channel not found in cache. Fetching...`);
                const fetchedChannel = await client.channels.fetch(BUG_CHANNEL_ID).catch(console.error);
                if (fetchedChannel) {
                    console.log(`✅ Channel fetched: ${fetchedChannel.name}`);
                } else {
                    console.log(`❌ Channel cannot be fetched!`);
                    return;
                }
            }

            const bugEmbed = new EmbedBuilder()
                .setTitle('🚨 NEW BUG REPORT')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Username', value: discordUsername, inline: true },
                    { name: 'User ID', value: interaction.user.id, inline: true },
                    { name: 'Description', value: bugDescription.substring(0, 1000), inline: false }
                )
                .setTimestamp();

            // ✅ CHANGED: Removed "NEW BUG REPORT" text and added @everyone mention only
            const sentMessage = await bugChannel.send({
                content: `@everyone`, // ✅ শুধু mention, অন্য text নেই
                embeds: [bugEmbed]
            });

            console.log(`✅ SMS SENT SUCCESSFULLY to channel! Message ID: ${sentMessage.id}`);
            
        } catch (error) {
            console.error('❌ ERROR sending to bug channel:', error);
        }
    }
});

// Admin commands
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('/') && !message.author.bot) {
        const args = message.content.slice(1).split(' ');
        const command = args[0].toLowerCase();

        if (command === 'buglist') {
            if (bugReports.size === 0) {
                return message.reply('No pending bugs.');
            }

            let bugList = '';
            for (const [bugId, bug] of bugReports) {
                bugList += `**${bugId}** - ${bug.username}\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('Pending Bugs')
                .setDescription(bugList)
                .setColor(0xFFFF00);

            await message.channel.send({ embeds: [embed] });
        }
    }
});

// Error handling
client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
