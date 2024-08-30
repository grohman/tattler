const conf = require('config');
const jwt = require('socketio-jwt');

let result = null;
let redis;
let io;


function Tattler(ioInstance, redisAdapter, jwt) 
{
	'use strict';
	
	
	this.io = io = ioInstance;
	io.adapter(redisAdapter);
	io.use(jwt);
}

function getMyRooms(socket, joinedRooms) 
{
	'use strict';
	
	
	const socketId = socket.id;
	let result = {};
	let rooms = socket.nsp.adapter.rooms;
	let roomName;


	for (let root in joinedRooms)
	{
		for (let room of joinedRooms[root])
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


Tattler.prototype = 
{
	init: function () {
		'use strict';
		
		io.on('connection', function (socket) {
			const socketId = socket.id;
			let joinedRooms = {};
			
			const callbacks = {
				getRooms: function () {
					const myRooms = getMyRooms(socket, joinedRooms);
					
					socket.emit('roomsListing', {
						'rooms': Object.keys(myRooms)
					});
				},
				unsubscribe: function (roomName) {
					redis.get('tattler:sockets:' + socketId).then(sessionId =>
					{
						let done = false;
						
						if (sessionId !== null) {
							const myRooms = getMyRooms(socket, joinedRooms);
							
							for (let room in myRooms) 
							{
								if (myRooms.hasOwnProperty(room)) 
								{
									if (room === roomName) 
									{
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
					redis.get('tattler:sockets:' + socketId).then((sessionId) => 
					{
						if (!sessionId)
						{
							console.error(new Date().toString(), 'not found tattler:sockets:' + socketId);
							return;
						}
						
						redis.get('tattler:roots:' + sessionId + ':' + roomName).then(root => 
						{
							if (root === null)
							{
								console.error(new Date().toString(), 'not found tattler:access:' + sessionId + ':' + roomName);
								return;
							}
							
							socket.join('/' + root + '/user_' + sessionId);
							socket.join('/' + root + '/' + roomName);

							if (!joinedRooms[root]) 
								joinedRooms[root] = [];
							
							joinedRooms[root].push(roomName);

							io.sockets.to(socketId).emit('defaultEvent', {
								'handler': 'console.log',
								'message': 'joined room ' + roomName
							});
						});
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
		
		const Client = require('./Client');
		
		return Client
			.setRedis(redis)
			.setSocketId(socketId)
			.setSessionId(sessionId)
			.get();
	},
	makeRooms: function (root, rooms, sessionId) {
		'use strict';
		
		
		let result = [];

		if (typeof rooms === 'string') {
			rooms = rooms.split(',');
		}
		
		const Room = require('./Room');

		Room.setRedis(redis)
			.setRoot(root)
			.setIo(io)
			.setSessionId(sessionId);

		for (let roomName in rooms) 
		{
			if (rooms.hasOwnProperty(roomName)) 
			{
				if (rooms[roomName] === '') 
				{
					continue;
				}

				result.push(Room.create(rooms[roomName]));
			}
		}
		
		return result;
	},
	roomExists: function (root, roomName) 
	{
		return io.sockets.adapter.rooms.has('/' + root + '/' + roomName);
	}
};

module.exports = async function (socket) {
	'use strict';
	
	
	if (socket === undefined) {
		if (result !== null) {
			return result;
		}
		
		throw("Called tattler before defining socket");
	}
	
	const redisAdapter = require('@socket.io/redis-adapter');
	const redisClient = require('redis');
	
	const pubClient = redisClient.createClient({ url: `redis://${conf.redis.host}:${conf.redis.port}` });
	const subClient = pubClient.duplicate();
	
	await Promise.all([
		pubClient.connect(),
		subClient.connect()
	]);
	
	
	redis = pubClient;
	
	redis.on('error', function(err) {
		console.error((new Date()).toString(), 'Redis error:', err);
	});
	
	/** @namespace conf.jwt */
	/** @namespace conf.redis */
	result = new Tattler(socket,
		redisAdapter.createAdapter(pubClient, subClient),
		jwt.authorize({
			secret: conf.jwt.token,
			handshake: true
		}));
	
	result.init();
	
	return result;
};