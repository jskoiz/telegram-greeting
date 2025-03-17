import { Context, Telegraf } from "telegraf";
import { getConfig, updateConfig, addAdminUserId } from "./config.js";
import { scheduleWarningMessages } from "./scheduler.js";
import fs from "fs";
import { fetch } from "undici";

// Track user states for multi-step interactions
const userStates: Record<number, { action: string, step: number, data?: any }> = {};

// Helper function to check if a user is an admin
export const isAdmin = async (userId: number, ctx?: Context): Promise<boolean> => {
  try {
    // If we have a context, check if the user is an admin in the Telegram group
    if (ctx) {
      const groupId = process.env.TELEGRAM_GROUP_ID || "";
      const chatMember = await ctx.telegram.getChatMember(groupId, userId);
      
      // Check if the user is an admin or creator in the group
      const isGroupAdmin = ['administrator', 'creator'].includes(chatMember.status);
      console.log(`Admin check for user ID ${userId}. Is Telegram group admin? ${isGroupAdmin}`);
      
      return isGroupAdmin;
    }
    
    // Fallback to the old method if no context is provided
    const adminIds = getConfig().adminUserIds;
    const isInAdminList = adminIds.includes(userId);
    
    console.log(`Admin check for user ID ${userId}. Current admin IDs: ${adminIds.join(', ')}`);
    console.log(`Is user in admin list? ${isInAdminList}`);
    
    // If no admins are configured, allow the first user who tries to use admin commands
    // and add them to the admin list
    if (adminIds.length === 0) {
      console.log(`No admins configured. Adding user ${userId} as first admin.`);
      addAdminUserId(userId);
      return true;
    }
    
    return isInAdminList;
  } catch (error) {
    console.error(`Error checking if user ${userId} is an admin:`, error);
    
    // Fallback to the config list if there's an error
    const adminIds = getConfig().adminUserIds;
    return adminIds.includes(userId);
  }
};

// Setup settings-related handlers for the bot
export const setupSettingsHandlers = (bot: Telegraf) => {
  // Command to add a user as an admin
  bot.command('addadmin', async (ctx) => {
    const userId = ctx.from?.id;
    console.log(`Add admin command received from user ID: ${userId}`);
    
    // Check if the user is an admin
    if (!userId || !await isAdmin(userId, ctx)) {
      console.log(`User ${userId} is not an admin, denying access to add admin command`);
      return ctx.reply('⛔ Sorry, only admins can add other admins.');
    }
    
    // Get the user ID to add as admin from the command arguments
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('⚠️ Please provide a user ID to add as admin.\nUsage: /addadmin 123456789');
    }
    
    const newAdminId = Number(args[1]);
    if (isNaN(newAdminId)) {
      return ctx.reply('⚠️ Invalid user ID. Please provide a valid numeric ID.');
    }
    
    // Add the user as admin
    const added = addAdminUserId(newAdminId);
    if (added) {
      console.log(`User ${userId} added ${newAdminId} as an admin`);
      return ctx.reply(`✅ User ${newAdminId} has been added as an admin.`);
    } else {
      return ctx.reply(`ℹ️ User ${newAdminId} is already an admin.`);
    }
  });
  // Command to list current admins
  bot.command('listadmins', async (ctx) => {
    const userId = ctx.from?.id;
    console.log(`List admins command received from user ID: ${userId}`);
    
    // Check if the user is an admin
    if (!userId || !await isAdmin(userId, ctx)) {
      console.log(`User ${userId} is not an admin, denying access to list admins command`);
      return ctx.reply('⛔ Sorry, only admins can view the admin list.');
    }
    
    const adminIds = getConfig().adminUserIds;
    if (adminIds.length === 0) {
      return ctx.reply('ℹ️ No admins are currently configured.');
    } else {
      return ctx.reply(`👑 Current admins:\n${adminIds.join('\n')}`);
    }
  });
  
  // Settings command handler with interactive buttons
  bot.command('settings', async (ctx) => {
    const userId = ctx.from?.id;
    console.log(`Settings command received from user ID: ${userId}`);
    
    // Check if the user is an admin
    if (!userId) {
      console.log('User ID is undefined, denying access');
      return ctx.reply('⛔ Sorry, only admins can use this command.');
    }
    
    if (!await isAdmin(userId, ctx)) {
      console.log(`User ${userId} is not an admin, denying access`);
      return ctx.reply('⛔ Sorry, only admins can use this command.');
    }
    
    console.log(`User ${userId} is an admin, granting access to settings`);
    const currentConfig = getConfig();
    
    // Create inline keyboard with settings options
    return ctx.reply('⚙️ Bot Settings', {
      reply_markup: {
        inline_keyboard: [
          [{ text: `📊 Interval (${currentConfig.intervalInMinutes} min)`, callback_data: 'settings:interval' }],
          [{ text: '📝 Warning Message', callback_data: 'settings:text' }],
          [{ text: '🖼️ Warning Image', callback_data: 'settings:image' }],
          [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
        ]
      }
    });
  });

  // Handle callback queries from inline keyboard buttons
  bot.on('callback_query', async (ctx) => {
    // Get the callback data
    // In newer versions of Telegraf, data is accessed differently based on the callback type
    const callbackData = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    // Ensure data exists
    if (!callbackData) {
      await ctx.answerCbQuery('Invalid callback');
      return;
    }
    
    const userId = ctx.callbackQuery.from.id;
    
    // Check if the user is an admin
    console.log(`Callback query from user ID: ${userId}`);
    if (!await isAdmin(userId, ctx)) {
      console.log(`User ${userId} is not an admin, denying access to callback`);
      await ctx.answerCbQuery('⛔ Sorry, only admins can use these settings.');
      return;
    }
    
    console.log(`User ${userId} is an admin, processing callback`);
    // Parse the callback data
    const [prefix, action] = callbackData.split(':');
    
    // Only handle settings and interval callbacks
    if (prefix !== 'settings' && prefix !== 'interval') return;
    
    // Acknowledge the callback query
    await ctx.answerCbQuery();
    
    // Handle different settings actions
    if (action === 'cancel') {
      console.log(`User ${userId} cancelled settings`);
      // Clear user state
      delete userStates[userId];
      await ctx.editMessageText('⚙️ Settings cancelled');
      return;
    }
    
    // Handle interval setting
    else if (action === 'interval') {
      console.log(`User ${userId} is setting a new interval`);
      userStates[userId] = { action: 'interval', step: 1 };
      await ctx.editMessageText('⏱️ Enter the new interval in minutes (minimum 1):', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '1', callback_data: 'interval:1' },
              { text: '5', callback_data: 'interval:5' },
              { text: '10', callback_data: 'interval:10' },
              { text: '30', callback_data: 'interval:30' },
            ],
            [
              { text: '60', callback_data: 'interval:60' },
              { text: '120', callback_data: 'interval:120' },
              { text: '360', callback_data: 'interval:360' },
              { text: '720', callback_data: 'interval:720' },
            ],
            [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
          ]
        }
      });
    }
    
    // Handle text setting
    else if (action === 'text') {
      console.log(`User ${userId} is setting a new warning message text`);
      userStates[userId] = { action: 'text', step: 1 };
      await ctx.editMessageText('📝 Please send the new warning message text in your next message.\n\nCurrent text:\n' + getConfig().warningMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
          ]
        }
      });
    }
    
    // Handle image setting
    else if (action === 'image') {
      console.log(`User ${userId} is setting a new warning image`);
      userStates[userId] = { action: 'image', step: 1 };
      await ctx.editMessageText('🖼️ Please send the new warning image in your next message.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
          ]
        }
      });
    }
    
    // Handle interval value selection
    else if (callbackData.startsWith('interval:')) {
      const minutes = parseInt(callbackData.split(':')[1]);
      console.log(`User ${userId} selected interval: ${minutes} minutes`);
      
      updateConfig({ intervalInMinutes: minutes });
      
      // Reschedule warning messages with the new interval
      try {
        scheduleWarningMessages();
        await ctx.editMessageText(`✅ Warning message interval updated to ${minutes} minutes`);
        console.log(`Successfully updated interval to ${minutes} minutes and rescheduled messages`);
      } catch (error) {
        console.error('Failed to reschedule warning messages:', error);
        await ctx.editMessageText('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
      }
      
      // Clear user state
      delete userStates[userId];
    }
  });

  // Handle text messages for settings updates
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    // Check if we're waiting for input from this user
    if (!userStates[userId]) return;
    
    // Handle text message update
    if (userStates[userId].action === 'text' && userStates[userId].step === 1) {
      const newText = ctx.message.text;
      console.log(`User ${userId} is updating warning message text`);
      
      updateConfig({ warningMessage: newText });
      await ctx.reply('✅ Warning message text updated successfully');
      console.log(`Warning message text updated successfully by user ${userId}`);
      
      // Clear user state
      delete userStates[userId];
    }
    
    // Handle manual interval input (if they didn't use the buttons)
    else if (userStates[userId].action === 'interval' && userStates[userId].step === 1) {
      const newInterval = parseInt(ctx.message.text);
      console.log(`User ${userId} is manually setting interval to: ${newInterval}`);
      
      if (isNaN(newInterval) || newInterval < 1) {
        return ctx.reply('⚠️ Please provide a valid interval in minutes (minimum 1)');
      }
      
      updateConfig({ intervalInMinutes: newInterval });
      
      // Reschedule warning messages with the new interval
      try {
        scheduleWarningMessages();
        await ctx.reply(`✅ Warning message interval updated to ${newInterval} minutes`);
        console.log(`Successfully updated interval to ${newInterval} minutes and rescheduled messages`);
      } catch (error) {
        console.error('Failed to reschedule warning messages:', error);
        await ctx.reply('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
      }
      
      // Clear user state
      delete userStates[userId];
    }
  });

  // Handle photo messages for image updates
  bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    
    // Check if we're waiting for an image from this user
    if (!userStates[userId] || userStates[userId].action !== 'image' || userStates[userId].step !== 1) return;
    
    try {
      console.log(`User ${userId} is uploading a new warning image`);
      // Get the photo file ID (use the highest quality version)
      const photos = ctx.message.photo;
      const photoId = photos[photos.length - 1].file_id;
      
      // Get the file path
      const fileInfo = await ctx.telegram.getFile(photoId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      
      // Download the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Ensure assets directory exists
      if (!fs.existsSync('./assets')) {
        fs.mkdirSync('./assets');
      }
      
      // Save the file
      const timestamp = Date.now();
      const newImagePath = `./assets/warning_${timestamp}.jpg`;
      fs.writeFileSync(newImagePath, buffer);
      
      // Update config
      updateConfig({ warningImagePath: newImagePath });
      
      await ctx.reply(`✅ Warning image updated successfully`);
      console.log(`Warning image updated successfully by user ${userId} to ${newImagePath}`);
      
      // Clear user state
      delete userStates[userId];
    } catch (error) {
      console.error('Failed to update image:', error);
      await ctx.reply('❌ Failed to update image. Please try again.');
    }
  });
};
