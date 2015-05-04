var server = require('nodebootstrap-server');

server.setup(function(runningApp) {
  
  // runningApp.use(require('express-session')({secret: CONF.app.cookie_secret, resave: false, saveUninitialized: false}));
  
  // Choose your favorite view engine(s)  
  runningApp.set('view engine', 'handlebars');
  runningApp.engine('handlebars', require('hbs').__express);

  //// you could use two view engines in parallel (if you are brave):  
  // runningApp.set('view engine', 'j2');
  // runningApp.engine('j2', require('swig').renderFile);
  
  var socketio = require('socket.io')(runningApp.http);
  var tattler = require('tattler');
  tattler.socket(socketio);


  runningApp.use('/tattler', tattler);
  runningApp.use(require('routes')); // attach to root route
  
});