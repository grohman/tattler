// @see: https://gist.github.com/branneman/8048520
var conf = require('config');
var cluster = require('cluster');

if(cluster.isWorker){
    conf['app']['port']=parseInt(conf['app']['port']) - 1 + parseInt(cluster.worker.id);
}

require('app-module-path').addPath(__dirname + '/lib');

var server = require('nodebootstrap-server')
  , appConfig = require('./appConfig')
  , app    = require('express')();


app = require('nodebootstrap-htmlapp').setup(app);

server.setup(app, appConfig.setup);
