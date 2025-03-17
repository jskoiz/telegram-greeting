// Configuration that can be updated at runtime
let config = {
  greetingMessage: "Hello", // Used to greet new users
  warningMessage: "⚠️ *SECURITY WARNING* ⚠️\n\n*Never share* your phone number or password on a login page.\n\nIf someone messages you first and says they are a Trojan admin, *they are a scammer*. 🚫",
  intervalInMinutes: 5, // Time between repeated warning messages
  warningImagePath: './assets/warning.jpg', // Path to the warning image
  adminUserIds: [] as number[], // Will be populated from environment variable
};

// Function to add an admin user ID
export function addAdminUserId(userId: number) {
  if (!config.adminUserIds.includes(userId)) {
    config.adminUserIds.push(userId);
    console.log(`Added user ID ${userId} to admin list. Current admins: ${config.adminUserIds.join(', ')}`);
    return true;
  }
  return false;
}

// Function to update config values
export function updateConfig(updates: Partial<typeof config>) {
  config = { ...config, ...updates };
  return config;
}

// Function to get the current config
export function getConfig() {
  return { ...config }; // Return a copy to prevent direct modification
}

// Initialize admin users from environment variable if available
if (process.env.TELEGRAM_ADMIN_IDS) {
  try {
    const adminIds = process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => Number(id.trim()));
    config.adminUserIds = adminIds;
    console.log(`Loaded admin user IDs: ${adminIds.join(', ')}`);
  } catch (error) {
    console.error('Failed to parse TELEGRAM_ADMIN_IDS:', error);
    console.log('No valid admin IDs found in environment variable. The first user to use admin commands will be granted admin privileges.');
  }
} else {
  console.log('TELEGRAM_ADMIN_IDS not set in environment. The first user to use admin commands will be granted admin privileges.');
}

export default config;