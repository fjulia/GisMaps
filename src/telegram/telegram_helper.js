const TelegramBot = require('node-telegram-bot-api');


// replace the value below with the Telegram token you receive from @BotFather
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

function sendMessage(){
  var chatId,doc;
  bot.sendDocument(chatId,doc);
}

export {sendMessage};
