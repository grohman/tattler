var conf = require('config');
var cluster = require('cluster');
if(cluster.isWorker){
  conf['app']['port']=parseInt(conf['app']['port']) - 1 + parseInt(cluster.worker.id);
}

var server = require('nodebootstrap-server');

server.setup(function(runningApp) {
  runningApp.set('view engine', 'handlebars');
  runningApp.engine('handlebars', require('hbs').__express); 

  var sio = require('socket.io');
  var tattler = require('tattler');
  tattler.socket(sio(runningApp.http));
  
  runningApp.use('/tattler', tattler);
  runningApp.use(require('routes'));  
});