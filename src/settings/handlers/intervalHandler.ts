import { Context } from "telegraf";
import { getConfig, updateConfig } from "../../config.js";
import { scheduleWarningMessages } from "../../scheduler.js";
import { setUserState, deleteUserState, updateUserStateTimestamp } from "../userState.js";
import logger from "../../logger.js";

export const handleIntervalSetting = async (ctx: Context, action: string, userId: number) => {
  if (action === 'interval') {
    setUserState(userId, { action: 'interval', step: 1, timestamp: Date.now() });
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
    return true;
  } else if (action.startsWith('interval:')) {
    const minutes = parseInt(action.split(':')[1]);
    updateConfig({ intervalInMinutes: minutes });
    try {
      scheduleWarningMessages();
      await ctx.editMessageText(`✅ Warning message interval updated to ${minutes} minutes`);
    } catch (error) {
      logger.error(`Failed to reschedule warning messages after interval update to ${minutes} minutes`);
      logger.debug(`Scheduling error details: ${error}`);
      
      await ctx.editMessageText('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
    }
    deleteUserState(userId);
    return true;
  }
  return false;
};

export const handleIntervalTextInput = async (ctx: Context, userId: number, text: string) => {
  const newInterval = parseInt(text);
  // Add maximum interval limit (24 hours = 1440 minutes)
  const MAX_INTERVAL = 1440;
  
  if (isNaN(newInterval) || newInterval < 1) {
    return ctx.reply('⚠️ Please provide a valid interval in minutes (minimum 1)');
  }
  
  if (newInterval > MAX_INTERVAL) {
    return ctx.reply(`⚠️ Interval too large. Maximum allowed is ${MAX_INTERVAL} minutes (24 hours)`);
  }
  
  updateConfig({ intervalInMinutes: newInterval });
  try {
    scheduleWarningMessages();
    await ctx.reply(`✅ Warning message interval updated to ${newInterval} minutes`);
  } catch (error) {
    logger.error(`Failed to reschedule warning messages after interval update to ${newInterval} minutes`);
    logger.debug(`Scheduling error details: ${error}`);
    
    await ctx.reply('⚠️ Interval updated, but failed to reschedule warning messages. Please restart the bot.');
  }
  deleteUserState(userId);
};
