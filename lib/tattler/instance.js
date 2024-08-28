var express = require('express');
var bodyParser = require('body-parser');
var sio = require('socket.io');
var tattler = require(__dirname);
var app = new express();
var instance = app.listen(0, 'localhost');

require('events').EventEmitter.defaultMaxListeners = 50;


// Listen to messages sent from the master. Ignore everything else.
var handleConnection = function(message, connection) {
	'use strict';

	if (message !== 'sticky-session:connection') {
		return;
	}

	instance.emit('connection', connection);
	connection.resume();
};

process.on('message', handleConnection);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


tattler.socket(
	sio(instance, {
		cors: {
			origin: "*",
		}
	})
);

app.disable("x-powered-by");

// API endpoint attached to root route:
app.use('/tattler', tattler);

app.use('/', function (req, res) {
	'use strict';

	res.send('OK');
});