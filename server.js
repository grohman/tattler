// @see: https://gist.github.com/branneman/8048520
require('app-module-path').addPath(__dirname + '/lib');
var conf = require('config');
var express = require('express');
var cluster = require('cluster');
var sticky = require('sticky-session');
var net = require('net');
var server = require('nodebootstrap-server');
var bodyParser = require('body-parser');


var sio = require('socket.io');
var sioRedis = require('socket.io-redis');
var jwt = require('socketio-jwt');
var tattler = require('tattler');

var num_processes = 1;
var masterPort = conf.app.port;

if (process.env.NODE_CLUSTERED > 0) {
	num_processes = require('os').cpus().length;
}


if (cluster.isMaster) {
	// This stores our workers. We need to keep them to be able to reference
	// them based on source IP address. It's also useful for auto-restart,
	// for example.
	var workers = [];

	// Helper function for spawning worker at index 'i'.
	var spawn = function (i) {
		workers[i] = cluster.fork();

		// Optional: Restart worker on exit
		workers[i].on('exit', function (code, signal) {
			console.log('respawning worker', i);
			spawn(i);
		});
	};

	// Spawn workers.
	for (var i = 0; i < num_processes; i++) {
		spawn(i);
	}

	// Helper function for getting a worker index based on IP address.
	// This is a hot path so it should be really fast. The way it works
	// is by converting the IP address to a number by removing non numeric
	// characters, then compressing it to the number of slots we have.
	//
	// Compared against "real" hashing (from the sticky-session code) and
	// "real" IP number conversion, this function is on par in terms of
	// worker index distribution only much faster.
	var worker_index = function (ip, len) {
		var s = '';
		for (var i = 0, _len = ip.length; i < _len; i++) {
			if (!isNaN(ip[i])) {
				s += ip[i];
			}
		}

		return Number(s) % len;
	};
	
	net.createServer({ pauseOnConnect: true }, function(connection) {
		var worker = workers[worker_index(connection.remoteAddress, num_processes)];
		worker.send('sticky-session:connection', connection);
	}).listen(masterPort);
	
} else {
	var app = new express();

	var instance = app.listen(0, 'localhost');

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	tattler.socket(
		sio(instance),
		sioRedis({host: conf.redis.host, port: conf.redis.port}),
		jwt
	);

	app.disable("x-powered-by");

	// API endpoint attached to root route:
	app.use('/tattler', tattler); // attach to root route

	app.use('/', function (req, res) {
		res.send('OK');
	});

	// Listen to messages sent from the master. Ignore everything else.
	process.on('message', function(message, connection) {
		if (message !== 'sticky-session:connection') {
			return;
		}
		instance.emit('connection', connection);
		connection.resume();
	});
	
	return true;
}