import logger from "./logger.js";

let config = {
  greetingMessage: "Hello",
  warningMessage: "⚠️ *SECURITY WARNING* ⚠️\n\n*Never share* your phone number or password on a login page.\n\nIf someone messages you first and says they are a Trojan admin, *they are a scammer*. 🚫",
  intervalInMinutes: 5,
  warningImagePath: './assets/warning.jpg',
};

export function updateConfig(updates: Partial<typeof config>) {
  config = { ...config, ...updates };
  return config;
}

export function getConfig() {
  return { ...config };
}

export default config;
