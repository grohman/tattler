var result = null;
var redisClient;

function Tattler(io, redisAdapter) {
    this.io = io;
    io.adapter(redisAdapter);
    redisClient = redisAdapter.pubClient;
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
        var _this = this;
        _this.io.on('connection', function (socket) {
            var socketId = socket['id'];
            var callbacks = {
                getRooms: function () {
                    var myRooms = getMyRooms(socket);
                    socket.emit('roomsListing', {
                        'rooms': Object.keys(myRooms)
                    });
                },
                unsubscribe: function (roomName) {
                    redisClient.get('tattler:sockets:' + socketId, function (err, sessionId) {
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
                    redisClient.get('tattler:sockets:' + socketId, function (err, sessionId) {
                        if (sessionId != null) {
                            redisClient.get('tattler:roots:' + sessionId + ':' + roomName, function (err, root) {
                                if (root != null) {
                                    //redisClient.del('tattler:roots:' + sessionId + ':' + roomName);
                                    socket.join('/' + root + '/broadcast');
                                    socket.join('/' + root + '/user_' + sessionId);
                                    var fullName = '/' + root + '/' + roomName;
                                    // console.log('join ' + sessionId + ' to ' + fullName)
                                    socket.join(fullName);
                                    _this.io.sockets.in(fullName).emit('defaultEvent', {
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
                    redisClient.del('tattler:sockets:' + socketId);
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
            .setRedis(redisClient)
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

        Room.setRedis(redisClient)
            .setRoot(root)
            .setIo(this.io)
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
        redisClient.sismember(hall, roomName, function (err, res) {
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