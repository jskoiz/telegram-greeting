import { sendWarningMessage } from "./bot.js";
import { getConfig } from "./config.js";

// Variable to store the interval timer
let warningInterval: NodeJS.Timeout | null = null;

// Function to schedule warning messages with the current interval
export const scheduleWarningMessages = () => {
  // Clear existing interval if it exists
  if (warningInterval) {
    clearInterval(warningInterval);
  }
  
  // Get the current interval from config
  const currentConfig = getConfig();
  const intervalMillis = currentConfig.intervalInMinutes * 60_000;
  
  console.log(`Scheduling warning messages every ${currentConfig.intervalInMinutes} minutes`);
  
  // Set new interval
  warningInterval = setInterval(() => {
    sendWarningMessage();
  }, intervalMillis);
};

// Function to clear the interval when shutting down
export const clearWarningInterval = () => {
  if (warningInterval) {
    clearInterval(warningInterval);
    warningInterval = null;
  }
};