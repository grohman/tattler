var result = null;
var redis;
var io;

function Tattler(ioInstance, redisAdapter) {
    this.io = io = ioInstance;
    io.adapter(redisAdapter);
    redis = redisAdapter.pubClient;
}

function getMyRooms(socket) {
    var socketId = socket['id'];
    var result = {};
    var rooms = socket.nsp.adapter.rooms;
    for (var room in rooms) {
        if(rooms.hasOwnProperty(room)) {
            if (rooms[room][socketId] !== undefined) {
                var roomName = room.split('/');
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

Tattler.prototype = {
    init: function () {
        io.on('connection', function (socket) {
            var socketId = socket['id'];
            var callbacks = {
                getRooms: function () {
                    var myRooms = getMyRooms(socket);
                    socket.emit('roomsListing', {
                        'rooms': Object.keys(myRooms)
                    });
                },
                unsubscribe: function (roomName) {
                    redis.get('tattler:sockets:' + socketId, function (err, sessionId) {
                        var done = false;
                        if (sessionId != null) {
                            var myRooms = getMyRooms(socket);
                            for (var room in myRooms) {
                                if(myRooms.hasOwnProperty(room)) {
                                    if (room == roomName) {
                                        socket.leave(myRooms[room]);
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
                        if (done == false) {
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
                        if (sessionId != null) {
                            redis.get('tattler:roots:' + sessionId + ':' + roomName, function (err, root) {
                                if (root != null) {
                                    socket.join('/' + root + '/broadcast');
                                    socket.join('/' + root + '/user_' + sessionId);
                                    var fullName = '/' + root + '/' + roomName;
                                    socket.join(fullName);
                                    io.sockets.to(socketId).emit('defaultEvent', {
                                        'handler': 'console.log',
                                        'message': 'joined room ' + roomName
                                    });
                                } else {
                                    console.error('not found tattler:access:' + sessionId + ':' + roomName);
                                }
                            });
                        } else {
                            console.error('not found tattler:sockets:' + socketId);
                        }
                    });
                },
                disconnect: function () {
                    redis.del('tattler:sockets:' + socketId);
                }
            };

            socket.on('getRooms', callbacks.getRooms);
            socket.on('subscribe', callbacks.subscribe);
            socket.on('unsubscribe', callbacks.unsubscribe);
            socket.on('disconnect', callbacks.disconnect);
        });
    },
    makeClient: function (socketId, sessionId) {
        var Client = require('./Client');

        return Client
            .setRedis(redis)
            .setSocketId(socketId)
            .setSessionId(sessionId)
            .get();
    },
    makeRooms: function (root, rooms, sessionId) {
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
            if(rooms.hasOwnProperty(roomName)) {
                if (rooms[roomName] == '') {
                    continue;
                }

                result.push(Room.create(rooms[roomName]));
            }
        }
        return result;
    },
    getRooms: function () {
        return rooms;
    },
    roomExists: function (root, roomName, callback) {
        var hall = 'tattler:rooms:' + root;
        redis.sismember(hall, roomName, function (err, res) {
            return callback(res);
        });

    }
};

module.exports = function (socket, socketRedisAdapter) {
    if (socket == undefined) {
        if (result != null) {
            return result;
        }

        throw("Called tattler before defining socket");
    }

    result = new Tattler(socket, socketRedisAdapter);
    result.init();

    return result;
};