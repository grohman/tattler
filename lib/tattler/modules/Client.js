var Client = function() {
	'use strict';

	var scope = {
        redisClient: null,
        socketId: null,
        sessionId: null
    };

    var self = this;

    this.setRedis = function(redis) {
        scope.redisClient = redis;
        return self;
    };

    this.setSocketId = function(socketId) {
        scope.socketId = socketId;
        return self;
    };

    this.setSessionId = function(sessionId) {
        scope.sessionId = sessionId;
        return self;
    };

    this.get = function () {
        var socket = 'tattler:sockets:' + scope.socketId;
        scope.redisClient.set(socket, scope.sessionId);

        this.getSession = function (socket) {
            var socketId = socket.id;
            return scope.redisClient.get(socketId);
        };

        return this;
    };

};

module.exports = new Client();