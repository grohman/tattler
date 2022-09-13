var conf = require('config');
var result = null;
var redis;
var io;

function Tattler(ioInstance, redisAdapter, jwt) {
	'use strict';
	
	this.io = io = ioInstance;
	io.adapter(redisAdapter);
	io.use(jwt);
	
	redis = redisAdapter.pubClient;
}

function getMyRooms(socket, joinedRooms) {
	'use strict';
	
	
	const socketId = socket.id;
	var result = {};
	var rooms = socket.nsp.adapter.rooms;
	var roomName;


	for (var root in joinedRooms)
	{
		for (var room of joinedRooms[root])
		{
			const key = '/' + root + '/' + room;

			if (rooms.hasOwnProperty(key))
			{
				if (rooms[key]['sockets'][socketId] !== undefined) {
					roomName = key.split('/');

					if (roomName[2] !== undefined) {
						result[roomName[2]] = key;
					} else {
						result[roomName[0]] = key;
					}
				}
			}
		}
	}
	
	return result;
}


Tattler.prototype = {
	init: function () {
		'use strict';
		
		io.on('connection', function (socket) {
			var socketId = socket.id;
			var joinedRooms = {};

			var callbacks = {
				getRooms: function () {
					var myRooms = getMyRooms(socket, joinedRooms);
					
					socket.emit('roomsListing', {
						'rooms': Object.keys(myRooms)
					});
				},
				unsubscribe: function (roomName) {
					redis.get('tattler:sockets:' + socketId, function (err, sessionId) {
						var done = false;
						
						if (sessionId !== null) {
							var myRooms = getMyRooms(socket, joinedRooms);
							
							for (var room in myRooms) {
								if (myRooms.hasOwnProperty(room)) {
									if (room === roomName) {
										socket.leave(myRooms[room], null);
										socket.emit('unsubscribe', {
											'error': false,
											'room': roomName,
											'message': 'You leaved ' + roomName
										});

										done = true;

										break;
									}
								}
							}
						}
						
						if (done === false) {
							socket.emit('unsubscribe', {
								'error': true,
								'room': roomName,
								'message': 'Failed to leave ' + roomName + ': undefined error'
							});
						}
					});
				},
				subscribe: function (roomName) {
					redis.get('tattler:sockets:' + socketId, function (err, sessionId) {
						if (sessionId !== null) {
							redis.get('tattler:roots:' + sessionId + ':' + roomName, function (err, root) {
								
								if (root !== null) {
									socket.join('/' + root + '/user_' + sessionId);
									socket.join('/' + root + '/' + roomName);

									if (!joinedRooms[root]) 
										joinedRooms[root] = [];
									
									joinedRooms[root].push(roomName);

									io.sockets.to(socketId).emit('defaultEvent', {
										'handler': 'console.log',
										'message': 'joined room ' + roomName
									});
								} else {
									console.error(new Date().toString(), 'not found tattler:access:' + sessionId + ':' + roomName);
								}
							});
						} else {
							console.error(new Date().toString(), 'not found tattler:sockets:' + socketId);
						}
					});
				},
				disconnect: function () {
					redis.del('tattler:sockets:' + socketId);

					joinedRooms = {};
				}
			};
			
			socket.on('getRooms', callbacks.getRooms);
			socket.on('subscribe', callbacks.subscribe);
			socket.on('unsubscribe', callbacks.unsubscribe);
			socket.on('disconnect', callbacks.disconnect);
		});
	},
	makeClient: function (socketId, sessionId) {
		'use strict';
		
		var Client = require('./Client');
		
		return Client
			.setRedis(redis)
			.setSocketId(socketId)
			.setSessionId(sessionId)
			.get();
	},
	makeRooms: function (root, rooms, sessionId) {
		'use strict';


		var result = [];

		if (typeof rooms === 'string') {
			rooms = rooms.split(',');
		}

		var Room = require('./Room');

		Room.setRedis(redis)
			.setRoot(root)
			.setIo(io)
			.setSessionId(sessionId);

		for (var roomName in rooms) {
			if (rooms.hasOwnProperty(roomName)) {
				if (rooms[roomName] === '') {
					continue;
				}

				result.push(Room.create(rooms[roomName]));
			}
		}
		return result;
	},
	roomExists: function (root, roomName) {
		return io.sockets.adapter.rooms['/' + root + '/' + roomName] != null;
	}
};

module.exports = function (socket, socketRedisAdapter, jwt) {
	'use strict';
	
	if (socket === undefined) {
		if (result !== null) {
			return result;
		}
		
		throw("Called tattler before defining socket");
	}
	
	/** @namespace conf.jwt */
	/** @namespace conf.redis */
	result = new Tattler(socket,
		socketRedisAdapter({
			host: conf.redis.host,
			port: conf.redis.port
		}),
		jwt.authorize({
			secret: conf.jwt.token,
			handshake: true
		}));
	
	result.init();
	
	return result;
};