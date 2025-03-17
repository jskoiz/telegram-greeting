import { Context } from "telegraf";
import { getConfig, updateConfig } from "../../config.js";
import { setUserState, deleteUserState } from "../userState.js";

export const handleTextSetting = async (ctx: Context, action: string, userId: number) => {
  if (action === 'text') {
    setUserState(userId, { action: 'text', step: 1, timestamp: Date.now() });
    await ctx.editMessageText('📝 Please send the new warning message text in your next message.\n\nCurrent text:\n' + getConfig().warningMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Cancel', callback_data: 'settings:cancel' }]
        ]
      }
    });
    return true;
  }
  return false;
};

export const handleTextMessageInput = async (ctx: Context, userId: number, text: string) => {
  // Validate and sanitize warning message text
  const messageText = text;
  
  // Check message length
  if (messageText.length > 4000) {
    return ctx.reply('⚠️ Message is too long. Maximum length is 4000 characters.');
  }
  
  // Basic Markdown sanitization to prevent injection
  // Replace any potentially problematic Markdown sequences
  const sanitizedText = messageText
    .replace(/`{3,}/g, '```') // Normalize code blocks
    .replace(/_{3,}/g, '__')   // Normalize underscores
    .replace(/\*{3,}/g, '**'); // Normalize asterisks
  
  updateConfig({ warningMessage: sanitizedText });
  await ctx.reply('✅ Warning message text updated successfully');
  deleteUserState(userId);
};
