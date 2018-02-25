

function sendTelegramMessage(bot,chatId,msg){
  console.log("sending to telegram message: "+msg);
  return bot.sendMessage(chatId,msg);
}


function sendTelegramLocation(bot,chatId,lat,lon){
  console.log("sending to telegram location lat: "+lat+" lone: "+lon);
  return bot.sendLocation(chatId,lat,lon);
}

function loadGroupId(bot,chatName,cb){
 return  bot.getUpdates().then((data)=>{
   var res = null;
    for(var i = 0; i< data.length ; i++){
      if(data[i].message.chat.title==chatName){
        res =  data[i].message.chat.id;
      }
    }
    return res;

  }).error((err)=>{
    console.log("error getting updates",err);
  })
}

export {sendTelegramMessage,sendTelegramLocation,loadGroupId};
