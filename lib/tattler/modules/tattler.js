var conf = require('config');
const {jsonParser} = require("config/parser");
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

function getMyRooms(socket) {
	'use strict';
	
	
	var socketId = socket.id;
	var result = {};
	var rooms = socket.nsp.adapter.rooms;
	var roomName;
	
	for (var room in rooms) {
		if (rooms.hasOwnProperty(room)) {
			if (rooms[room]['sockets'][socketId] !== undefined) {
				roomName = room.split('/');
				
				if (roomName[2] !== undefined) {
					result[roomName[2]] = room;
				} else {
					result[roomName[0]] = room;
				}
			}
		}
	}
	
	return result;
}

function isRoomInUse(socket, room)
{
	var rooms = socket.nsp.adapter.rooms;

	if (rooms.hasOwnProperty(room))
	{
		console.log('Here is number of sockets for room ' + room + ": " + rooms[room]['sockets'].length);

		return rooms[room]['sockets'].length > 0;
	}

	return false;
}

function deleteRoom(socket, room)
{
	var rooms = socket.nsp.adapter.rooms;

	if (rooms.hasOwnProperty(room))
	{
		delete rooms[room];
	}
}

Tattler.prototype = {
	init: function () {
		'use strict';
		
		io.on('connection', function (socket) {
			var socketId = socket.id;
			var joinedRooms = [];
			var callbacks = {
				getRooms: function () {
					var myRooms = getMyRooms(socket);
					
					socket.emit('roomsListing', {
						'rooms': Object.keys(myRooms)
					});
				},
				unsubscribe: function (roomName) {
					console.error('Here is number of socsadfsdf');

					redis.get('tattler:sockets:' + socketId, function (err, sessionId) {
						var done = false;
						
						if (sessionId !== null) {
							var myRooms = getMyRooms(socket);
							
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

										if(!isRoomInUse(socket, room))
										{
											deleteRoom(socket, room);
										}

										const index = joinedRooms.indexOf(roomName);
										if(index > -1)
										{
											joinedRooms.splice(index, 1);
										}

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
									// socket.join('/' + root + '/broadcast');
									socket.join('/' + root + '/user_' + sessionId);
									socket.join('/' + root + '/' + roomName);

									joinedRooms.push(roomName);

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

					for (var room of joinedRooms)
					{
						if (!isRoomInUse(socket, room))
						{
							deleteRoom(socket, room);
							console.log('room deleted ' + room);
						}
					}
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
	roomExists: function (root, roomName, callback) {
		'use strict';
		
		var hall = 'tattler:rooms:' + root;
		redis.sismember(hall, roomName, function (err, res) {
			return callback(res);
		});
		
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