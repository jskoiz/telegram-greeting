import { Context } from "telegraf";
import logger from "../logger.js";

export const isAdmin = async (userId: number, ctx: Context): Promise<boolean> => {
  const groupId = process.env.TELEGRAM_GROUP_ID || "";
  if (!groupId) {
    logger.error("TELEGRAM_GROUP_ID not set");
    return false;
  }
  try {
    const admins = await ctx.telegram.getChatAdministrators(groupId);
    const isGroupAdmin = admins.some(admin => admin.user.id === userId);
    logger.info(`Admin check for user ID ${userId}. Is Telegram group admin? ${isGroupAdmin}`);
    return isGroupAdmin;
  } catch (error) {
    // Log a sanitized error message without exposing implementation details
    logger.error(`Failed to verify admin status for user ${userId}`);
    // Log detailed error for debugging with a lower log level
    logger.debug(`Admin check error details: ${error}`);
    return false;
  }
};
