import { bot } from "./bot.js";
import { scheduleWarningMessages, clearWarningInterval } from "./scheduler.js";

// Launch the bot
bot.launch().then(() => {
  console.log("Bot has been started...");
  
  // Schedule initial warning messages
  scheduleWarningMessages();
});

// Graceful stop
process.once("SIGINT", () => {
  clearWarningInterval();
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  clearWarningInterval();
  bot.stop("SIGTERM");
});