#!/bin/bash

# This script prepares an Ubuntu server for the Telegram bot deployment
# Run this script on your Ubuntu server before setting up the GitHub Actions workflow

# Exit on any error
set -e

echo "=== Setting up server for Telegram bot deployment ==="

# Update package lists
echo "Updating package lists..."
sudo apt-get update

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "Node.js version:"
node --version
echo "npm version:"
npm --version

# Install PM2 globally
echo "Installing PM2 globally..."
sudo npm install -g pm2

# Create project directory
echo "Creating project directory..."
mkdir -p ~/newbot

# Initialize Git repository if it doesn't exist
if [ ! -d ~/newbot/.git ]; then
  echo "Initializing Git repository..."
  cd ~/newbot
  git init
  git config --global init.defaultBranch main
  
  # Set up Git to allow the GitHub Actions workflow to push to this repository
  git config receive.denyCurrentBranch updateInstead
fi

echo "=== Server setup complete ==="
echo ""
echo "Next steps:"
echo "1. Add the following secrets to your GitHub repository:"
echo "   - SERVER_IP: Your server's IP address"
echo "   - SERVER_USERNAME: Your server's username"
echo "   - SSH_PRIVATE_KEY: Your SSH private key"
echo "   - TELEGRAM_BOT_TOKEN: Your Telegram bot token"
echo "   - TELEGRAM_GROUP_ID: Your Telegram group ID"
echo ""
echo "2. Push your code to the 'prod' branch to trigger the deployment"
echo ""
echo "3. To monitor your bot, use the following PM2 commands:"
echo "   - pm2 list: List all running applications"
echo "   - pm2 logs newbot: View logs for the bot"
echo "   - pm2 restart newbot: Restart the bot"
echo "   - pm2 stop newbot: Stop the bot"
echo "   - pm2 start newbot: Start the bot"
