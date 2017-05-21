var cluster = require('cluster');
var net = require('net');
var conf = require('config');
var num_processes = 1;

if (process.env.NODE_CLUSTERED > 0) {
	num_processes = require('os').cpus().length;
}

var workers = [];

// Helper function for spawning worker at index 'i'.
var spawn = function (i) {
	'use strict';

	workers[i] = cluster.fork();

	// Optional: Restart worker on exit
	workers[i].on('exit', function (code, signal) {
		console.log(new Date().toString(), 'respawning worker', i, 'after', signal, 'with', code);
		spawn(i);
	});
};

// Spawn workers.
for (var i = 0; i < num_processes; i++) {
	spawn(i);
}

var worker_index = function (ip, len) {
	'use strict';

	var s = '';
	for (var i = 0, _len = ip.length; i < _len; i++) {
		if (!isNaN(ip[i])) {
			s += ip[i];
		}
	}

	return Number(s) % len;
};

/** @namespace conf.app */
module.exports = net.createServer({pauseOnConnect: true}, function (connection) {
	'use strict';

	var worker = workers[worker_index(connection.remoteAddress, num_processes)];
	worker.send('sticky-session:connection', connection);
}).listen(conf.app.port);