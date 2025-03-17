# Telegram Warning Bot

A simple Telegram bot that greets new users and sends periodic warning messages to a group.

## Features

- Greets new users when they join the group
- Sends periodic warning messages to help prevent scams
- Configurable greeting message, warning message, and interval

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
   TELEGRAM_GROUP_ID=<your-telegram-group-id>
   ```
   - To get a bot token, talk to [@BotFather](https://t.me/BotFather) on Telegram
   - To get your group ID, add [@RawDataBot](https://t.me/RawDataBot) to your group temporarily

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Configuration

You can modify the bot's behavior by editing the `src/config.ts` file:

- `greetingMessage`: The message sent to greet new users
- `warningMessage`: The periodic warning message sent to the group
- `intervalInMinutes`: How often the warning message is sent

## Development

To run the bot in development mode:

```bash
npm run dev
```

