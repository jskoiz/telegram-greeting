import { sendWarningMessage } from "./bot.js";
import { getConfig } from "./config.js";
import logger from "./logger.js";

let warningInterval: NodeJS.Timeout | null = null;

export const scheduleWarningMessages = () => {
  if (warningInterval) {
    clearInterval(warningInterval);
  }
  
  const currentConfig = getConfig();
  const intervalMillis = currentConfig.intervalInMinutes * 60_000;
  
  logger.info(`Scheduling warning messages every ${currentConfig.intervalInMinutes} minutes`);
  
  warningInterval = setInterval(() => {
    sendWarningMessage();
  }, intervalMillis);
};

export const clearWarningInterval = () => {
  if (warningInterval) {
    clearInterval(warningInterval);
    warningInterval = null;
    logger.info("Cleared warning message interval");
  }
};
