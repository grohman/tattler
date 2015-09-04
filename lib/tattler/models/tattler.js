exports = module.exports;
var result = null;

var redis = require("redis");
var redisClient = redis.createClient();

redisClient.on("error", function (err) {
    console.error("Redis error " + err);
});


function Client(socketId, sessionId) {

    var client = 'tattler:clients:' + sessionId;
    redisClient.sadd(client, socketId);

    var socket = 'tattler:sockets:' + socketId;
    redisClient.set(socket, sessionId);

    this.getSockets = function () {
        return redisClient.smembers('tattler:clients:' + sessionId);
    };

    this.getSession = function (socket) {
        var socketId = socket['id'];
        return redisClient.get(socketId);
    }

    return this;
};


function Room(io, root, roomName, sessionId) {
    var room;
    var hall = 'tattler:rooms:' + root;

    redisClient.sismember(hall, roomName, function (err, res) {
        if (res == 0) {
            room = io.of('/' + root + '/' + roomName);
            room['rawName'] = roomName;
            room['root'] = root;

            room.getRawName = function () {
                return this['rawName'];
            };

            room.getRoot = function () {
                return this['root'];
            };
            redisClient.sadd(hall, roomName);
        }
    });


    var access = 'tattler:roots:' + sessionId + ':' + roomName;
    redisClient.set(access, root);
    setTimeout(function () {
        redisClient.del(access);
    }, 30000);

    return roomName;
}

function Tattler(io) {
    this.io = io;
    var redis = require('socket.io-redis');
    io.adapter(redis({host: 'localhost', port: 6379}));
}

function getMyRooms(socket) {
    var socketId = socket['id']
    var result = {}
    var rooms = socket.nsp.adapter.rooms;
    for (var i in rooms) {
        if (rooms[i][socketId] !== undefined) {
            var roomName = i.split('/');
            if (roomName[2] !== undefined) {
                result[roomName[2]] = i;
            } else {
                result[roomName[0]] = i;
            }
        }
    }
    return result;
}

Tattler.prototype = {
    'init': function () {
        var _this = this;
        _this.io.on('connection', function (socket) {
            var socketId = socket['id'];

            socket.on('getRooms', function () {
                var myRooms = getMyRooms(socket);
                socket.emit('roomsListing', {
                    'rooms': Object.keys(myRooms)
                });
            });

            socket.on('unsubscribe', function (roomName) {
                redisClient.get('tattler:sockets:' + socketId, function (err, sessionId) {
                    var done = false;
                    if (sessionId != null) {
                        var myRooms = getMyRooms(socket);
                        for (var i in myRooms) {
                            if (i == roomName) {
                                socket.leave(myRooms[i])
                                socket.emit('unsubscribe', {
                                    'error': false,
                                    'room' : roomName,
                                    'message': 'You leaved ' + roomName
                                });
                                done = true;
                                break;
                            }
                        }
                    }
                    if(done == false) {
                        socket.emit('unsubscribe', {
                            'error': true,
                            'room' : roomName,
                            'message': 'Failed to leave ' + roomName + ': undefined error'
                        });
                    }
                });
            });
            socket.on('subscribe', function (roomName) {
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
            });

            socket.on('disconnect', function () {
                redisClient.del('tattler:sockets:' + socketId);
            });
        });
    },
    'makeClient': function (socketId, sessionId) {
        return new Client(socketId, sessionId);
    },
    'makeRooms': function (root, rooms, sessionId) {
        var result = [];

        if (typeof rooms == 'string') {
            rooms = rooms.split(',');
        }
        for (var i in rooms) {
            if (rooms[i] == '') {
                continue;
            }
            new Room(this.io, root, rooms[i], sessionId)
            result.push(rooms[i]);
        }
        return result;
    },
    'getRooms': function () {
        return rooms;
    },
    'roomExists': function (root, roomName, callback) {
        var hall = 'tattler:rooms:' + root;
        var result = false;
        redisClient.sismember(hall, roomName, function (err, res) {
            return callback(res);
        });

    },
    'getIo': function () {
        return this.io;
    }
};

module.exports = function (socket) {
    if (socket == undefined) {
        if (result != null) {
            return result;
        }
        throw("Called tattler before defining socket");
    }
    result = new Tattler(socket);
    result.init();
    return result;
};