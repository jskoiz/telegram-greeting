import { Context, Telegraf } from "telegraf";
import { getConfig, updateConfig, addAdminUserId } from "./config.js";
import { scheduleWarningMessages } from "./scheduler.js";
import fs from "fs";
import { fetch } from "undici";
import logger from "./logger.js";

const userStates: Record<number, { action: string, step: number, data?: any }> = {};

export const isAdmin = async (userId: number, ctx?: Context): Promise<boolean> => {
  try {
    if (ctx) {
      const groupId = process.env.TELEGRAM_GROUP_ID || "";
      const chatMember = await ctx.telegram.getChatMember(groupId, userId);
      const isGroupAdmin = ['administrator', 'creator'].includes(chatMember.status);
      logger.info(`Admin check for user ID ${userId}. Is Telegram group admin? ${isGroupAdmin}`);
      return isGroupAdmin;
    }
    
    const adminIds = getConfig().adminUserIds;
    const isInAdminList = adminIds.includes(userId);
    logger.info(`Admin check for user ID ${userId}. Current admin IDs: ${adminIds.join(', ')}`);
    logger.info(`Is user in admin list? ${isInAdminList}`);
    
    if (adminIds.length === 0) {
      logger.info(`No admins configured. Adding user ${userId} as first admin.`);
      addAdminUserId(userId);
      return true;
    }
    
    return isInAdminList;
  } catch (error) {
    logger.error(`Error checking if user ${userId} is an admin: ${error}`);
    const adminIds = getConfig().adminUserIds;
    return adminIds.includes(userId);
  }
};

export const setupSettingsHandlers = (bot: Telegraf) => {
  bot.command('addadmin', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info(`Add admin command received from user ID: ${userId}`);
    
    if (!userId || !await isAdmin(userId, ctx)) {
      logger.info(`User ${userId} is not an admin, denying access to add admin command`);
      return ctx.reply('⛔ Sorry, only admins can add other admins.');
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('⚠️ Please provide a user ID to add as admin.\nUsage: /addadmin 123456789');
    }
    
    const newAdminId = Number(args[1]);
    if (isNaN(newAdminId)) {
      return ctx.reply('⚠️ Invalid user ID. Please provide a valid numeric ID.');
    }
    
    const added = addAdminUserId(newAdminId);
    if (added) {
      logger.info(`User ${userId} added ${newAdminId} as an admin`);
      return ctx.reply(`✅ User ${newAdminId} has been added as an admin.`);
    } else {
      return ctx.reply(`ℹ️ User ${newAdminId} is already an admin.`);
    }
  });
  
  bot.command('listadmins', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info(`List admins command received from user ID: ${userId}`);
    
    if (!userId || !await isAdmin(userId, ctx)) {
      logger.info(`User ${userId} is not an admin, denying access to list admins command`);
      return ctx.reply('⛔ Sorry, only admins can view the admin list.');
    }
    
    const adminIds = getConfig().adminUserIds;
    if (adminIds.length === 0) {
      return ctx.reply('ℹ️ No admins are currently configured.');
    } else {
      return ctx.reply(`👑 Current admins:\n${adminIds.join('\n')}`);
    }
  });
  
  bot.command('settings', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info(`Settings command received from user ID: ${userId}`);
    
    if (!userId) {
      logger.info('User ID is undefined, denying access');
      return ctx.reply('⛔ Sorry, only admins can use this command.');
    }
    
    if (!await isAdmin(userId, ctx)) {
      logger.info(`User ${userId} is not an admin, denying access`);
      return ctx.reply('⛔ Sorry, only admins can use this command.');
    }
    
    logger.info(`User ${userId} is an admin, granting access to settings`);
    const currentConfig = getConfig();
    
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

  bot.on('callback_query', async (ctx) => {
    const callbackData = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (!callbackData) {
      await ctx.answerCbQuery('Invalid callback');
      return;
    }
    
    const userId = ctx.callbackQuery.from.id;
    
    logger.info(`Callback query from user ID: ${userId}`);
    if (!await isAdmin(userId, ctx)) {
      logger.info(`User ${userId} is not an admin, denying access to callback`);
      await ctx.answerCbQuery('⛔ Sorry, only admins can use these settings.');
      return;
    }
    
    logger.info(`User ${userId} is an admin, processing callback`);
    const [prefix, action] = callbackData.split(':');
    
    if (prefix !== 'settings' && prefix !== 'interval') return;
    
    await ctx.answerCbQuery();
    
    if (action === 'cancel') {
      logger.info(`User ${userId} cancelled settings`);
      delete userStates[userId];
      await ctx.editMessageText('⚙️ Settings cancelled');
      return;
    }
    
    else if (action === 'interval') {
      logger.info(`User ${userId} is setting a new interval`);
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
    
    else if (action === 'text') {
      logger.info(`User ${userId} is setting a new warning message text`);
      userStates[userId] = { action: 'text', step: 1 };
      await ctx.editMessageText('📝 Please send the new warning message text in your next message.\n\nCurrent text:\n' + getConfig().warningMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
          ]
        }
      });
    }
    
    else if (action === 'image') {
      logger.info(`User ${userId} is setting a new warning image`);
      userStates[userId] = { action: 'image', step: 1 };
      await ctx.editMessageText('🖼️ Please send the new warning image in your next message.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
          ]
        }
      });
    }
    
    else if (callbackData.startsWith('interval:')) {
      const minutes = parseInt(callbackData.split(':')[1]);
      logger.info(`User ${userId} selected interval: ${minutes} minutes`);
      
      updateConfig({ intervalInMinutes: minutes });
      
      try {
        scheduleWarningMessages();
        await ctx.editMessageText(`✅ Warning message interval updated to ${minutes} minutes`);
        logger.info(`Successfully updated interval to ${minutes} minutes and rescheduled messages`);
      } catch (error) {
        logger.error(`Failed to reschedule warning messages: ${error}`);
        await ctx.editMessageText('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
      }
      
      delete userStates[userId];
    }
  });

  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    
    if (!userStates[userId]) return;
    
    if (userStates[userId].action === 'text' && userStates[userId].step === 1) {
      const newText = ctx.message.text;
      logger.info(`User ${userId} is updating warning message text`);
      
      updateConfig({ warningMessage: newText });
      await ctx.reply('✅ Warning message text updated successfully');
      logger.info(`Warning message text updated successfully by user ${userId}`);
      
      delete userStates[userId];
    }
    
    else if (userStates[userId].action === 'interval' && userStates[userId].step === 1) {
      const newInterval = parseInt(ctx.message.text);
      logger.info(`User ${userId} is manually setting interval to: ${newInterval}`);
      
      if (isNaN(newInterval) || newInterval < 1) {
        return ctx.reply('⚠️ Please provide a valid interval in minutes (minimum 1)');
      }
      
      updateConfig({ intervalInMinutes: newInterval });
      
      try {
        scheduleWarningMessages();
        await ctx.reply(`✅ Warning message interval updated to ${newInterval} minutes`);
        logger.info(`Successfully updated interval to ${newInterval} minutes and rescheduled messages`);
      } catch (error) {
        logger.error(`Failed to reschedule warning messages: ${error}`);
        await ctx.reply('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
      }
      
      delete userStates[userId];
    }
  });

  bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    
    if (!userStates[userId] || userStates[userId].action !== 'image' || userStates[userId].step !== 1) return;
    
    try {
      logger.info(`User ${userId} is uploading a new warning image`);
      const photos = ctx.message.photo;
      const photoId = photos[photos.length - 1].file_id;
      
      const fileInfo = await ctx.telegram.getFile(photoId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (!fs.existsSync('./assets')) {
        fs.mkdirSync('./assets');
      }
      
      const timestamp = Date.now();
      const newImagePath = `./assets/warning_${timestamp}.jpg`;
      fs.writeFileSync(newImagePath, buffer);
      
      updateConfig({ warningImagePath: newImagePath });
      
      await ctx.reply(`✅ Warning image updated successfully`);
      logger.info(`Warning image updated successfully by user ${userId} to ${newImagePath}`);
      
      delete userStates[userId];
    } catch (error) {
      logger.error(`Failed to update image: ${error}`);
      await ctx.reply('❌ Failed to update image. Please try again.');
    }
  });
};
