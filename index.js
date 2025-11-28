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
const ALLOWED_CHANNEL_ID = '1443932014750335141';

// Store message IDs for deletion
const bugMessages = new Map();

// Auto-delete bug reports after 10 seconds
const AUTO_DELETE_TIME = 10 * 1000; // 10 seconds

// Store timers for each bug
const bugTimers = new Map();

client.once('ready', () => {
    console.log(`✅ Bug Report Bot is online as ${client.user.tag}`);
    console.log(`📋 Bug Channel ID: ${BUG_CHANNEL_ID}`);
    console.log(`🎯 Allowed Channel ID: ${ALLOWED_CHANNEL_ID}`);
});

// Handle bug report command - ONLY IN ALLOWED CHANNEL
client.on('messageCreate', async (message) => {
    if (message.content === '!bug' && !message.author.bot) {
        if (message.channel.id !== ALLOWED_CHANNEL_ID) {
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

    // Handle /bughelp command
    if (message.content === '/bughelp' && !message.author.bot) {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🐛 Bug Report System - Commands')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: '🛠️ User Commands', 
                    value: '`!bug` - Open bug report form\n`/bughelp` - Show this help menu', 
                    inline: false 
                },
                { 
                    name: '⚙️ Admin Commands', 
                    value: '`/bugfix <bug_id>` - Mark bug as fixed and notify user\n`/bugnotfix <bug_id>` - Mark bug as not fixed\n`/bugdismiss <bug_id>` - Dismiss bug and notify user\n`/buglist` - Show all pending bugs', 
                    inline: false 
                },
                { 
                    name: '📝 How to Use', 
                    value: '1. Use `!bug` in the designated channel\n2. Fill out the form\n3. Get your Bug ID\n4. Admins will use your Bug ID to update status', 
                    inline: false 
                }
            )
            .setFooter({ text: 'DrkSurvraze Bug Report System' })
            .setTimestamp();

        await message.channel.send({ embeds: [helpEmbed] });
    }

    // Handle /bugfix command - UPDATED VERSION
    if (message.content.startsWith('/bugfix') && !message.author.bot) {
        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply('❌ Usage: `/bugfix <bug_id>`');
        }
        
        const bugId = args[1];
        const bug = bugReports.get(bugId);
        
        if (!bug) {
            return message.reply('❌ Bug ID not found!');
        }

        // Send confirmation in current channel
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
        
        // Send DM to the user who reported the bug - WITH BUG DESCRIPTION
        try {
            const user = await client.users.fetch(bug.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 Your Bug Has Been Fixed!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Your Username', value: bug.username, inline: true },
                    { name: 'Status', value: '✅ FIXED', inline: true },
                    { name: 'Bug Description', value: bug.description.length > 1000 ? bug.description.substring(0, 1000) + '...' : bug.description, inline: false }
                )
                .setDescription('Thank you for reporting the bug! Your issue has been resolved.')
                .setFooter({ text: 'DrkSurvraze Bug System' })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
            console.log(`✅ DM sent to user: ${bug.username} (${bug.userId})`);
            
        } catch (error) {
            console.log(`❌ Could not send DM to user: ${bug.username}`);
            await message.reply(`⚠️ Bug marked as fixed but could not send DM to ${bug.username}`);
        }

        // ✅ START 10 SECOND TIMER AFTER /bugfix COMMAND
        startDeleteTimer(bugId);
        
        console.log(`⏰ 10-second delete timer started for: ${bugId}`);
    }

    // Handle /bugnotfix command
    if (message.content.startsWith('/bugnotfix') && !message.author.bot) {
        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply('❌ Usage: `/bugnotfix <bug_id>`');
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

        // Send DM to user - WITH BUG DESCRIPTION
        try {
            const user = await client.users.fetch(bug.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Your Bug Could Not Be Fixed')
                .setColor(0xFFA500)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Your Username', value: bug.username, inline: true },
                    { name: 'Status', value: '❌ NOT FIXED', inline: true },
                    { name: 'Bug Description', value: bug.description.length > 1000 ? bug.description.substring(0, 1000) + '...' : bug.description, inline: false }
                )
                .setDescription('We were unable to resolve this issue at this time.')
                .setFooter({ text: 'DrkSurvraze Bug System' })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('Could not send DM to user');
        }

        // ✅ START 10 SECOND TIMER AFTER /bugnotfix COMMAND
        startDeleteTimer(bugId);
        
        console.log(`⏰ 10-second delete timer started for: ${bugId}`);
    }

    // Handle /bugdismiss command
    if (message.content.startsWith('/bugdismiss') && !message.author.bot) {
        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply('❌ Usage: `/bugdismiss <bug_id>`');
        }
        
        const bugId = args[1];
        const bug = bugReports.get(bugId);
        
        if (!bug) {
            return message.reply('❌ Bug ID not found!');
        }

        // Send DM to user - WITH BUG DESCRIPTION
        try {
            const user = await client.users.fetch(bug.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('📋 Your Bug Report Has Been Dismissed')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Your Username', value: bug.username, inline: true },
                    { name: 'Status', value: '❌ DISMISSED', inline: true },
                    { name: 'Bug Description', value: bug.description.length > 1000 ? bug.description.substring(0, 1000) + '...' : bug.description, inline: false }
                )
                .setDescription('If you think this was a mistake, please report again.')
                .setFooter({ text: 'DrkSurvraze Bug System' })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('Could not send DM to user');
        }

        // ✅ START 10 SECOND TIMER AFTER /bugdismiss COMMAND
        startDeleteTimer(bugId);
        
        await message.reply(`✅ Bug ${bugId} has been dismissed. Message will delete in 10 seconds.`);
        console.log(`⏰ 10-second delete timer started for: ${bugId}`);
    }

    // Handle /buglist command
    if (message.content === '/buglist' && !message.author.bot) {
        if (bugReports.size === 0) {
            return message.reply('📝 No pending bugs found.');
        }

        const embed = new EmbedBuilder()
            .setTitle('🐛 Pending Bug Reports')
            .setColor(0xFFFF00)
            .setDescription(`Total pending bugs: ${bugReports.size}`);

        let bugList = '';
        for (const [bugId, bug] of bugReports) {
            const timePassed = Math.floor((Date.now() - bug.timestamp) / 1000);
            bugList += `**${bugId}** - ${bug.username} (${timePassed}s ago)\n`;
        }

        embed.addFields({ name: 'Bugs', value: bugList || 'No bugs' });

        await message.channel.send({ embeds: [embed] });
    }
});

// Handle bug report button click
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'report_bug') {
        if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
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

        // ✅ REMOVED username field, only bug description
        const bugDescriptionInput = new TextInputBuilder()
            .setCustomId('bug_description')
            .setLabel('Bug Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe the bug in detail...')
            .setRequired(true)
            .setMaxLength(2000);

        const actionRow = new ActionRowBuilder().addComponents(bugDescriptionInput);

        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }
});

// Handle bug report modal submission - UPDATED VERSION
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'bug_report_modal') {
        if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
            return await interaction.reply({
                content: '❌ **Error:** This form can only be used in the designated bug report channel.',
                ephemeral: true
            });
        }
        
        const bugDescription = interaction.fields.getTextInputValue('bug_description');

        if (!bugDescription.trim()) {
            return await interaction.reply({
                content: '❌ **Please describe the bug!**',
                ephemeral: true
            });
        }

        const bugId = 'BUG_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now();

        // ✅ Store with username from interaction user
        bugReports.set(bugId, {
            username: interaction.user.username, // Get username from Discord
            description: bugDescription,
            userId: interaction.user.id,
            timestamp: timestamp
        });

        console.log(`✅ Bug stored: ${bugId} by ${interaction.user.username}`);

        const userEmbed = new EmbedBuilder()
            .setTitle('✅ Bug Report Submitted Successfully!')
            .setColor(0x00FF00)
            .addFields(
                { name: '🆔 Bug ID', value: bugId, inline: true },
                { name: '👤 Your Username', value: interaction.user.username, inline: true },
                { name: '📝 Bug Description', value: bugDescription.length > 500 ? bugDescription.substring(0, 500) + '...' : bugDescription, inline: false }
            )
            .setFooter({ text: 'We will review your bug report soon' })
            .setTimestamp();

        await interaction.reply({
            embeds: [userEmbed],
            ephemeral: true
        });

        // Send to bug channel and store message ID
        try {
            const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
            if (bugChannel) {
                const bugEmbed = new EmbedBuilder()
                    .setTitle('🚨 NEW BUG REPORT')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Bug ID', value: bugId, inline: true },
                        { name: 'Username', value: interaction.user.username, inline: true },
                        { name: 'Description', value: bugDescription.substring(0, 1500), inline: false }
                    )
                    .setTimestamp();

                const sentMessage = await bugChannel.send({
                    content: `@everyone`,
                    embeds: [bugEmbed]
                });

                // Store message ID for deletion later
                bugMessages.set(bugId, sentMessage.id);
                console.log(`✅ Bug message stored: ${bugId} -> ${sentMessage.id}`);
                
                // ❌ NO AUTO-DELETE TIMER HERE - Timer will start only after /bugfix command
            }
        } catch (error) {
            console.error('❌ ERROR sending to bug channel:', error);
        }
    }
});

// Function to start 10-second delete timer
function startDeleteTimer(bugId) {
    // Clear existing timer if any
    if (bugTimers.has(bugId)) {
        clearTimeout(bugTimers.get(bugId));
    }

    // Start new 10-second timer
    const timer = setTimeout(async () => {
        if (bugReports.has(bugId)) {
            console.log(`🕒 Auto-deleting bug after /bugfix: ${bugId}`);
            await deleteBugMessage(bugId);
            bugReports.delete(bugId);
            bugMessages.delete(bugId);
            bugTimers.delete(bugId);
        }
    }, AUTO_DELETE_TIME);

    bugTimers.set(bugId, timer);
    console.log(`⏰ 10-second delete timer started for: ${bugId}`);
}

// Function to delete bug message from bug channel
async function deleteBugMessage(bugId) {
    try {
        const messageId = bugMessages.get(bugId);
        if (messageId) {
            const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
            if (bugChannel) {
                try {
                    const message = await bugChannel.messages.fetch(messageId);
                    if (message) {
                        await message.delete();
                        console.log(`✅ Deleted bug message: ${bugId}`);
                    }
                } catch (fetchError) {
                    console.log(`❌ Message already deleted: ${bugId}`);
                }
            }
            bugMessages.delete(bugId);
        }
    } catch (error) {
        console.log(`❌ Could not delete bug message: ${bugId}`, error);
    }
}

// Error handling
client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
