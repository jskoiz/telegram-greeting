import logger from "./logger.js";

let config = {
  greetingMessage: "Hello",
  warningMessage: "⚠️ *SECURITY WARNING* ⚠️\n\n*Never share* your phone number or password on a login page.\n\nIf someone messages you first and says they are a Trojan admin, *they are a scammer*. 🚫",
  intervalInMinutes: 5,
  warningImagePath: './assets/warning.jpg',
  adminUserIds: [] as number[],
};

export function addAdminUserId(userId: number) {
  if (!config.adminUserIds.includes(userId)) {
    config.adminUserIds.push(userId);
    logger.info(`Added user ID ${userId} to admin list. Current admins: ${config.adminUserIds.join(', ')}`);
    return true;
  }
  return false;
}

export function updateConfig(updates: Partial<typeof config>) {
  config = { ...config, ...updates };
  return config;
}

export function getConfig() {
  return { ...config };
}

if (process.env.TELEGRAM_ADMIN_IDS) {
  try {
    const adminIds = process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => Number(id.trim()));
    config.adminUserIds = adminIds;
    logger.info(`Loaded admin user IDs: ${adminIds.join(', ')}`);
  } catch (error) {
    logger.error(`Failed to parse TELEGRAM_ADMIN_IDS: ${error}`);
    logger.info('No valid admin IDs found in environment variable. The first user to use admin commands will be granted admin privileges.');
  }
} else {
  logger.info('TELEGRAM_ADMIN_IDS not set in environment. The first user to use admin commands will be granted admin privileges.');
}

export default config;
