exports = module.exports;
var result = null;

function Tattler(io) {
    this.io = io;
    this.rooms = {};

    this.clientsRooms = {};
    this.roomsClients = {};

    this.clientsSessions = {};
    this.sessionsClients = {};
}

Tattler.prototype = {
    init: function () {
        var _this = this;

        function joinRooms(socket, rooms) {
            var now = +new Date;
            for (var i in rooms) {
                var roomName = rooms[i]['name'];
                console.log('joining to ' + roomName)
                socket.join(rooms[i]);

                if (_this.clientsRooms[socket['id']] == undefined) {
                    _this.clientsRooms[socket['id']] = [];
                }

                if (_this.roomsClients[roomName] == undefined) {
                    _this.roomsClients[roomName] = {};
                }

                _this.clientsRooms[socket['id']].push(roomName);
                _this.roomsClients[roomName][socket['id']] = now;
            }
        }

        _this.io.on('connection', function (socket) {
            var query = socket['handshake']['query'];

            socket.on('disconnect', function () {
                var socketId = socket['id'];
                var sessionId = _this.clientsSessions[socketId];

                delete _this.clientsSessions[socketId];

                _this.sessionsClients[sessionId] = _this.sessionsClients[sessionId].filter(function (e) {
                    return e != socketId;
                });
                if (_this.sessionsClients[sessionId].length == 0) {
                    delete _this.sessionsClients[sessionId];
                }

                console.log('User with socketId ' + socketId + ' disconnected. Removing session ' + sessionId);


                var myRooms = _this.clientsRooms[socketId];
                if (myRooms !== undefined) {
                    for (var i in myRooms) {
                        console.log('leaving room ' + myRooms[i])
                        delete _this.roomsClients[myRooms[i]][socket['id']]
                        if (Object.keys(_this.roomsClients[myRooms[i]]).length == 0) {
                            delete _this.rooms[myRooms[i]];
                            delete _this.roomsClients[myRooms[i]]
                        }
                    }
                    delete _this.clientsRooms[socket['id']]
                }
            });
        });
    },
    joinRooms: function (root, rooms, client) {
        var sessionId = client['sessionId'];
        var sockets = this.sessionsClients[sessionId];
        var joined = [];
        if (this.clientsRooms[sessionId] == undefined) {
            this.clientsRooms[sessionId] = [];
        }
        var now = +new Date;
        for (var i in sockets) {
            var socket = this['io']['sockets']['connected'][sockets[i]];
            if (socket !== undefined) {
                for (var n in rooms) {
                    var roomName = rooms[n];

                    socket.join(this.rooms[root][roomName]);
                    joined.push(roomName);

                    if (this.roomsClients[roomName] == undefined) {
                        this.roomsClients[roomName] = {};
                    }

                    this.clientsRooms[sessionId].push(roomName);
                    this.roomsClients[roomName][sessionId] = now;


                }
            }
        }
        return joined;
    },
    makeRooms: function (root, rooms) {
        var _this = this;
        var result = [];
        if (rooms == undefined) {
            rooms = [];
        }
        if (typeof rooms == 'string') {
            rooms = rooms.split(',');
        }

        if (rooms.indexOf('broadcast') == -1) {
            rooms.unshift('broadcast');
        }

        if (_this['rooms'][root] == undefined) {
            _this['rooms'][root] = {};
        }

        for (var i in rooms) {
            if (rooms[i] == '') {
                continue;
            }

            result.push(rooms[i]);

            if (_this['rooms'][root][rooms[i]] == undefined) {
                _this['rooms'][root][rooms[i]] = _this.io.of(root + '/' + rooms[i]);
                _this['rooms'][root][rooms[i]]['rawName'] = rooms[i];
                _this['rooms'][root][rooms[i]]['root'] = root;

                _this['rooms'][root][rooms[i]].on('defaultEvent', function (msg) {
                    _this.io.emit('defaultEvent', msg)
                });
                console.log('created room: ' + rooms[i]);
            }

        }
        // console.log(result);
        return result;
    },
    makeClient: function (socketId, sessionId) {
        this.clientsSessions[socketId] = sessionId;
        if (this.sessionsClients[sessionId] == undefined) {
            this.sessionsClients[sessionId] = [];
        }
        if (this.sessionsClients[sessionId].indexOf(socketId) == -1) {
            this.sessionsClients[sessionId].push(socketId);
        }
        //console.log('storedPassport', socketId, sessionId)
        return true;
    },
    getSocket: function () {
        if (this.socket === undefined || this.socket.nsps == undefined) {
            throw('Socket undefined');
        }
        return this.socket;
    },
    getClients: function () {
        return this.clientsRooms;
    },
    getRoomsClients: function () {
        return this.roomsClients;
    },
    getClientsSessions: function () {
        return this.clientsSessions;
    },
    getSessions: function () {
        return this.sessionsClients;
    }
}


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