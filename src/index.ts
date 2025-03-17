import { bot } from "./bot.js";
import { scheduleWarningMessages, clearWarningInterval } from "./scheduler.js";
import logger from "./logger.js";

bot.launch().then(() => {
  logger.info("Bot has been started...");
  scheduleWarningMessages();
});

process.once("SIGINT", () => {
  clearWarningInterval();
  bot.stop("SIGINT");
  logger.info("Bot stopped due to SIGINT");
});

process.once("SIGTERM", () => {
  clearWarningInterval();
  bot.stop("SIGTERM");
  logger.info("Bot stopped due to SIGTERM");
});
