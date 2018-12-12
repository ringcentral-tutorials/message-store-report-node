const RC = require('ringcentral');
require('dotenv').load();
var fs = require('fs');
var https = require('https');

var rcsdk = null
if (process.env.ENVIRONMENT_MODE == "production"){
  rcsdk = new RC({
    server:RC.server.production,
    appKey: process.env.CLIENT_ID_PROD,
    appSecret:process.env.CLIENT_SECRET_PROD,
  })
}else{
  rcsdk = new RC({
      server:RC.server.sandbox,
      appKey: process.env.CLIENT_ID_SB,
      appSecret:process.env.CLIENT_SECRET_SB
    })
}
var platform = rcsdk.platform()
login()

function CreateMessageStoreReport(){
  console.log("creating report task ...")
  var endpoint = "/restapi/v1.0/account/~/message-store-report"
  var date = new Date()
  var time = date.getTime()
  var lessXXDays = time - (84600 * 30 * 1000)
  var from = new Date(lessXXDays)
  var dateFrom = from.toISOString()
  var dateTo = date.toISOString()
  console.log(dateFrom)
  console.log(dateTo)
  return
  var params = {
    dateFrom: dateFrom,
    dateTo: dateTo
  }
  platform.post(endpoint, params)
    .then(function(resp){
      var json = resp.json()
      if (json.status == "Completed"){
        GetMessageStoreReportArchive(json.id)
      }else
        GetMessageStoreReportTask(json.id)
    })
    .catch(function(e){
      console.log(e)
    })
}

function GetMessageStoreReportTask(taskId){
  console.log("polling ...")
  var endpoint = "/restapi/v1.0/account/~/message-store-report/" + taskId
  platform.get(endpoint)
    .then(function(resp){
      var json = resp.json()
      if (json.status == "Completed"){
        GetMessageStoreReportArchive(json.id)
      }else {
        setTimeout(function(){
          GetMessageStoreReportTask(taskId)
        }, 2000);
      }
    })
    .catch(function(e){
      console.log(e)
    })
}

function GetMessageStoreReportArchive(taskId){
  console.log("getting report uri ...")
  var endpoint = "/restapi/v1.0/account/~/message-store-report/"+ taskId +"/archive"
  platform.get(endpoint)
    .then(function(resp){
      var json = resp.json()
      var date = new Date()
      for (var i=0; i< json.records.length; i++){
        var fileName = date.toISOString() + "_" + i + ".zip"
        GetMessageStoreReportArchiveContent(json.records[i].uri, fileName)
      }
    })
    .catch(function(e){
      console.log(e)
    })

}

function GetMessageStoreReportArchiveContent(contentUri, fileName){
  var uri = platform.createUrl(contentUri, {addToken: true});
  var dest = "./archives/" + fileName
  download(uri, dest, function(){
    console.log("Save report zip file to archives folder.")
  })
}

const download = function(uri, dest, cb) {
    var file = fs.createWriteStream(dest);
    var request = https.get(uri, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(cb);
      });
    });
  }

function login(){
  var un = ""
  var pwd = ""
  if (process.env.ENVIRONMENT_MODE == "production"){
    un= process.env.USERNAME_PROD,
    pwd= process.env.PASSWORD_PROD
  }else{
    un= process.env.USERNAME_SB,
    pwd= process.env.PASSWORD_SB
  }

  platform.login({
    username:un,
    password:pwd
  })
  .then(function(resp){
    CreateMessageStoreReport()
  })
  .catch(function(e){
    throw e
  })
}
