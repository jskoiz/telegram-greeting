import { Telegraf } from "telegraf";
import { isAdmin } from "./adminUtils.js";
import { initUserStateManagement, getUserState, updateUserStateTimestamp, deleteUserState } from "./userState.js";
import { registerSettingsMenuHandler } from "./handlers/settingsMenu.js";
import { handleIntervalSetting, handleIntervalTextInput } from "./handlers/intervalHandler.js";
import { handleTextSetting, handleTextMessageInput } from "./handlers/textHandler.js";

export const setupSettingsHandlers = (bot: Telegraf) => {
  // Initialize user state management
  initUserStateManagement();
  
  // Register settings menu handler
  registerSettingsMenuHandler(bot);

  // Handle callback queries
  bot.on('callback_query', async (ctx) => {
    const callbackData = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    if (!callbackData) {
      await ctx.answerCbQuery('Invalid callback');
      return;
    }
    const userId = ctx.callbackQuery.from.id;
    
    // Update timestamp if user has an existing state
    if (getUserState(userId)) {
      updateUserStateTimestamp(userId);
    }
    
    if (!(await isAdmin(userId, ctx))) {
      await ctx.answerCbQuery('⛔ Sorry, only admins can use these settings.');
      return;
    }
    await ctx.answerCbQuery();
    const [prefix, action] = callbackData.split(':');
    if (prefix !== 'settings' && prefix !== 'interval') return;

    if (action === 'cancel') {
      deleteUserState(userId);
      await ctx.editMessageText('⚙️ Settings cancelled');
      return;
    } 
    
    // Try to handle with interval handler
    if (await handleIntervalSetting(ctx, action, userId)) {
      return;
    }
    
    // Try to handle with text handler
    if (await handleTextSetting(ctx, action, userId)) {
      return;
    }
  });

  // Handle text messages
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userState = getUserState(userId);
    if (!userState) return;
    
    // Update timestamp to prevent state from expiring during active use
    updateUserStateTimestamp(userId);
    
    if (userState.action === 'text' && userState.step === 1) {
      await handleTextMessageInput(ctx, userId, ctx.message.text);
    } else if (userState.action === 'interval' && userState.step === 1) {
      await handleIntervalTextInput(ctx, userId, ctx.message.text);
    }
  });
};

export { isAdmin } from "./adminUtils.js";
