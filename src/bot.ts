import { Telegraf, Context } from "telegraf";
import dotenv from "dotenv";
import config, { getConfig } from "./config.js";
import { scheduleWarningMessages } from "./scheduler.js";
import { setupSettingsHandlers } from "./settings.js";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const GROUP_ID = process.env.TELEGRAM_GROUP_ID || "";

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing in .env file");
}
if (!GROUP_ID) {
  throw new Error("TELEGRAM_GROUP_ID is missing in .env file");
}

// Create a new Telegraf instance
const bot = new Telegraf(BOT_TOKEN);

// Listen for new chat members
bot.on("new_chat_members", (ctx) => {
  const newMembers = ctx.message?.new_chat_members;
  if (newMembers && newMembers.length > 0) {
    newMembers.forEach((member) => {
      const username = member.username || member.first_name || "there";
      console.log(`New user joined: ${username} (ID: ${member.id})`);
      ctx.reply(`${config.greetingMessage} ${username}`)
        .then(() => {
          console.log(`Welcome message sent to: ${username}`);
        })
        .catch(error => {
          console.error(`Failed to send welcome message to ${username}:`, error);
        });
    });
  }
});

// Set up settings handlers
setupSettingsHandlers(bot);

// Function to send the warning message
const sendWarningMessage = async () => {
  try {
    const currentConfig = getConfig();
    console.log("Sending warning message with image to group...");
    // Send photo with caption
    await bot.telegram.sendPhoto(
      GROUP_ID,
      { source: currentConfig.warningImagePath },
      {
        caption: currentConfig.warningMessage,
        parse_mode: 'Markdown'
      }
    );
    console.log("Warning message with image sent successfully");
  } catch (error) {
    console.error("Failed to send warning message:", error);
  }
};

// Export both the bot and the sendWarningMessage function
export { bot, sendWarningMessage };