var conf = require('config');
var cpus = conf['app']['numCpus'];

if(cpus > 1 && process.env.NODE_CLUSTERED == 1) {
	var cluster = require('cluster');
	if(cluster.isWorker){
  		conf['app']['port']=parseInt(conf['app']['port']) - 1 + parseInt(cluster.worker.id);
	} else {
    	for (var i = 1; i < cpus; i++) {
        	cluster.fork();
    	}
	}
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
