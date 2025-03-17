import logger from "../logger.js";

// User state with timeout tracking
export interface UserState {
  action: string;
  step: number;
  data?: any;
  timestamp: number; // When this state was last updated
}

// Store for user states
const userStates: Record<number, UserState> = {};

// Timeout for user states (10 minutes)
export const USER_STATE_TIMEOUT_MS = 10 * 60 * 1000;

// Clean up expired user states
export const cleanupExpiredStates = () => {
  const now = Date.now();
  for (const userId in userStates) {
    if (now - userStates[parseInt(userId)].timestamp > USER_STATE_TIMEOUT_MS) {
      logger.info(`Cleaning up expired state for user ${userId}`);
      delete userStates[parseInt(userId)];
    }
  }
};

// Set up state management
export const initUserStateManagement = () => {
  setInterval(cleanupExpiredStates, 60 * 1000); // Check every minute
};

// Update timestamp when a user state is accessed
export const updateUserStateTimestamp = (userId: number) => {
  if (userStates[userId]) {
    userStates[userId].timestamp = Date.now();
    logger.debug(`Updated timestamp for user ${userId}`);
  }
};

// Get user state
export const getUserState = (userId: number): UserState | undefined => {
  return userStates[userId];
};

// Set user state
export const setUserState = (userId: number, state: UserState) => {
  userStates[userId] = state;
};

// Delete user state
export const deleteUserState = (userId: number) => {
  delete userStates[userId];
};
