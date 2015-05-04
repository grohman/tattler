exports = module.exports;
var result = null;


var clients = {
    // sessionId: [socket1, socket2, ...]
};
var rooms = {
    // root: [room1, room2, ...]
};

var sockets = {};


function Client(socketId, sessionId) {
    var client = clients[sessionId];
    if (client == undefined) {
        client = clients[sessionId] = this.object = clients[sessionId] = {};
    } else {
        this.object = client;
    }

    if (client[socketId] == undefined) {
        client[socketId] = sockets[socketId];
        client[socketId]['sessionId'] = sessionId;
    }

    this.getSocket = function (socketId) {
        return client[socketId];
    };

    return this;
};

function Room(io, root, roomName) {
    var _this = this;
    var rootExists = rooms[root];
    if (rootExists == undefined) {
        rooms[root] = [];
    }

    var room = rooms[root][roomName];
    if (room == undefined) {
        room = rooms[root][roomName] = this.object = io.of('/' + root + '/' + roomName);
        room['rawName'] = roomName;
        room['root'] = root;

        console.log('Room: created ' + root + '->' + roomName);
    } else {
        this.object = room;
    }

    this.join = function (socket) {
        var result = socket.join(room);
        //console.log('Room@join: ' + socket['id'] + ' to ' + _this.getName());
        return result;
    };

    this.getRawName = function () {
        return room['rawName'];
    };
    this.getName = function () {
        return '/' + room['root'] + '/' + room['rawName'];
    };

    this.getRoot = function() {
        return root;
    };
    return this;
}


function Tattler(io) {
    this.io = io;
}

Tattler.prototype = {
    'init': function () {
        var _this = this;
        _this.io.on('connection', function (socket) {
            var socketId = socket['id'];
            sockets[socketId] = socket;

            //socket.on('disconnect', function(){
            //    console.log('disconnect...');
            //});
        });
    },
    'makeClient': function (socketId, sessionId) {
        return new Client(socketId, sessionId);
    },
    'makeRooms': function (root, rooms) {
        var result = [];

        if (typeof rooms == 'string') {
            rooms = rooms.split(',');
        }
        for (var i in rooms) {
            if (rooms[i] == '') {
                continue;
            }
            result.push(new Room(this.io, root, rooms[i]));
        }
        return result;
    },
    'joinRooms': function (rooms, socket) {
        var result = [];
        for (var i in rooms) {
            var roomName = rooms[i].getName();
            //console.log('Tatter: joinRoom ' + roomName);
            socket.join(roomName);
            result.push(rooms[i].getRawName());
        }
        //console.log('Tattler: joinRooms', result);
        return result;
    },
    'emit': function (room, event, message) {
        return room.emit(event, message);
    },
    'getRooms': function () {
        return rooms;
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