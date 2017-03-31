require('app-module-path').addPath(__dirname + '/lib');

var conf = require('config');

exports.setup = function(runningApp, callback) {
  // Nothing ever comes from "x-powered-by", but a security hole
  runningApp.disable("x-powered-by");

  runningApp.set('view engine', 'handlebars');
  runningApp.engine('handlebars', require('hbs').__express);

  var sio = require('socket.io');
  var sioRedis = require('socket.io-redis');
  var jwt = require('socketio-jwt');
  var tattler = require('tattler');

  tattler.socket(
      sio(runningApp.http), 
      sioRedis({host: conf.redis.host, port: conf.redis.port}),
      jwt
  );

  // API endpoint attached to root route:
  runningApp.use('/tattler', tattler); // attach to root route


  if(typeof callback === 'function') {
    callback(runningApp);
  }
};
