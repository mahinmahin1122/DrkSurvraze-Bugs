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

    // Handle /bugfix command - FIXED VERSION
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
        
        // ✅ Send DM to the user who reported the bug
        try {
            const user = await client.users.fetch(bug.userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 Your Bug Has Been Fixed!')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Bug ID', value: bugId, inline: true },
                    { name: 'Your Username', value: bug.username, inline: true },
                    { name: 'Status', value: '✅ FIXED', inline: true },
                    { name: 'Bug Description', value: bug.description.length > 500 ? bug.description.substring(0, 500) + '...' : bug.description, inline: false }
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

        // Remove from storage
        bugReports.delete(bugId);
    }

    // Handle other admin commands
    if (message.content.startsWith('/') && !message.author.bot) {
        const args = message.content.slice(1).split(' ');
        const command = args[0].toLowerCase();

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
                const timeAgo = Math.floor((Date.now() - bug.timestamp) / 1000 / 60);
                bugList += `**${bugId}** - ${bug.username} (${timeAgo} min ago)\n`;
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
        if (interaction.channel.id !== ALLOWED_CHANNEL_ID) {
            return await interaction.reply({
                content: '❌ **Error:** This form can only be used in the designated bug report channel.',
                ephemeral: true
            });
        }
        
        const discordUsername = interaction.fields.getTextInputValue('discord_username');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');

        if (!discordUsername.trim() || !bugDescription.trim()) {
            return await interaction.reply({
                content: '❌ **Please fill in all required fields!**\n\n- Discord Username\n- Bug Description',
                ephemeral: true
            });
        }

        const bugId = 'BUG_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now();

        bugReports.set(bugId, {
            username: discordUsername,
            description: bugDescription,
            userId: interaction.user.id,
            timestamp: timestamp
        });

        console.log(`✅ Bug stored: ${bugId} by ${discordUsername}`);

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
            const bugChannel = client.channels.cache.get(BUG_CHANNEL_ID);
            if (bugChannel) {
                const bugEmbed = new EmbedBuilder()
                    .setTitle('🚨 NEW BUG REPORT')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Bug ID', value: bugId, inline: true },
                        { name: 'Username', value: discordUsername, inline: true },
                        { name: 'Description', value: bugDescription.substring(0, 1000), inline: false }
                    )
                    .setTimestamp();

                await bugChannel.send({
                    content: `@everyone`,
                    embeds: [bugEmbed]
                });
            }
        } catch (error) {
            console.error('❌ ERROR sending to bug channel:', error);
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
