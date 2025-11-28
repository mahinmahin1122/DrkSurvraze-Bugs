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
const ALLOWED_CHANNEL_ID = '1443932014750335141'; // ✅ শুধু এই চ্যানেলে কাজ করবে

client.once('ready', () => {
    console.log(`✅ Bug Report Bot is online as ${client.user.tag}`);
    console.log(`📋 Bug Channel ID: ${BUG_CHANNEL_ID}`);
    console.log(`🎯 Allowed Channel ID: ${ALLOWED_CHANNEL_ID}`);
    
    // Check channel access
    const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
    if (bugChannel) {
        console.log(`✅ Bug channel found: ${bugChannel.name}`);
    } else {
        console.log(`❌ Bug channel NOT found! Check ID: ${BUG_CHANNEL_ID}`);
    }
    
    const allowedChannel = client.channels.cache.get(ALLOWED_CHANNEL_ID);
    if (allowedChannel) {
        console.log(`✅ Allowed channel found: ${allowedChannel.name}`);
    } else {
        console.log(`❌ Allowed channel NOT found! Check ID: ${ALLOWED_CHANNEL_ID}`);
    }
});

// Handle bug report command - ONLY IN ALLOWED CHANNEL
client.on('messageCreate', async (message) => {
    if (message.content === '!bug' && !message.author.bot) {
        console.log(`🐛 Bug command from ${message.author.tag} in #${message.channel.name}`);
        
        // ✅ Check if command is used in allowed channel
        if (message.channel.id !== ALLOWED_CHANNEL_ID) {
            console.log(`❌ Command used in wrong channel: ${message.channel.id}`);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Command Not Allowed Here')
                .setDescription(`**!bug** command can only be used in <#${ALLOWED_CHANNEL_ID}> channel.`)
                .setColor(0xFF0000)
                .setFooter({ text: 'Please use the correct channel' });
                
            return await message.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
        
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
        
        // ✅ Check if button is clicked in allowed channel
        if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
            console.log(`❌ Button clicked in wrong channel: ${interaction.channel.id}`);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Action Not Allowed Here')
                .setDescription(`Bug reports can only be submitted from <#${ALLOWED_CHANNEL_ID}> channel.`)
                .setColor(0xFF0000);
                
            return await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
        
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

// Handle bug report modal submission
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'bug_report_modal') {
        console.log(`📄 Modal submitted by ${interaction.user.tag}`);
        
        // ✅ Check if modal is submitted from allowed channel
        if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
            console.log(`❌ Modal submitted from wrong channel: ${interaction.channel.id}`);
            
            return await interaction.reply({
                content: '❌ **Error:** This form can only be used in the designated bug report channel.',
                ephemeral: true
            });
        }
        
        const discordUsername = interaction.fields.getTextInputValue('discord_username');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');

        // ✅ VALIDATION: Check if fields are empty
        if (!discordUsername.trim() || !bugDescription.trim()) {
            return await interaction.reply({
                content: '❌ **Please fill in all required fields!**\n\n- Discord Username\n- Bug Description',
                ephemeral: true
            });
        }

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

        // Show bug description in user confirmation
        const userEmbed = new EmbedBuilder()
            .setTitle('✅ Bug Report Submitted Successfully!')
            .setColor(0x00FF00)
            .addFields(
                { name: '🆔 Bug ID', value: bugId, inline: true },
                { name: '👤 Your Username', value: discordUsername, inline: true },
                { name: '📝 Bug Description', value: bugDescription.length > 500 ? bugDescription.substring(0, 500) + '...' : bugDescription, inline: false }
            )
            .setFooter({ text: 'We will review your bug report soon' })
            .setTimestamp();

        await interaction.reply({
            embeds: [userEmbed],
            ephemeral: true
        });

        // Send to bug channel
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
                    { name: 'Description', value: bugDescription.substring(0, 1000), inline: false }
                )
                .setTimestamp();

            const sentMessage = await bugChannel.send({
                content: `@everyone`,
                embeds: [bugEmbed]
            });

            console.log(`✅ SMS SENT SUCCESSFULLY to channel! Message ID: ${sentMessage.id}`);
            
        } catch (error) {
            console.error('❌ ERROR sending to bug channel:', error);
        }
    }
});

// Admin commands - work in any channel
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
