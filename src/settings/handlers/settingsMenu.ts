import { Context, Telegraf } from "telegraf";
import { getConfig } from "../../config.js";
import { isAdmin } from "../adminUtils.js";
import logger from "../../logger.js";

export const registerSettingsMenuHandler = (bot: Telegraf) => {
  bot.command('settings', async (ctx) => {
    const userId = ctx.from?.id;
    logger.info(`Settings command received from user ID: ${userId}`);
    if (!userId || !(await isAdmin(userId, ctx))) {
      return ctx.reply('⛔ Sorry, only admins can use this command.');
    }
    const currentConfig = getConfig();
    return ctx.reply('⚙️ Bot Settings', {
      reply_markup: {
        inline_keyboard: [
          [{ text: `📊 Interval (${currentConfig.intervalInMinutes} min)`, callback_data: 'settings:interval' }],
          [{ text: '📝 Warning Message', callback_data: 'settings:text' }],
          [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
        ]
      }
    });
  });
};
