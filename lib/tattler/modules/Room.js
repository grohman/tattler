function Room() {
	'use strict';
    
	var self = this;
    var scope = {
        redisClient: null,
        io: null,
        root: null,
        sessionId: null
    };

    this.setRedis = function(redis) { scope.redisClient = redis; return self; };
    this.setIo = function(io) { scope.io = io; return self; };
    this.setRoot = function(root) { scope.root = root; return self; };
    this.setSessionId = function(sessionId) { scope.sessionId = sessionId; return self; };

    this.create = function(roomName) {
        var room;
        var hall = 'tattler:rooms:' + scope.root;

        scope.redisClient.sismember(hall, roomName, function (err, res) {
            if (res === 0) {
                room = scope.io.of('/' + scope.root + '/' + roomName);

                room.rawName = roomName;
                room.root = scope.root;

                room.getRawName = function () {
                    return this.rawName;
                };

                room.getRoot = function () {
                    return this.root;
                };

                scope.redisClient.sadd(hall, roomName);
            }
        });


        var access = 'tattler:roots:' + scope.sessionId + ':' + roomName;
        scope.redisClient.set(access, scope.root);
        scope.redisClient.expireat(access, parseInt((+new Date)/1000) + 30);

        return roomName;
    };
}


module.exports = new Room();