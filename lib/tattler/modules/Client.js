const Client = function() {
	'use strict';
    
    
    const scope = {
        redisClient: null,
        socketId: null,
        sessionId: null
    };
    
    
    const self = this;
    

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

    this.get = async function () {
        const socket = 'tattler:sockets:' + scope.socketId;
        await scope.redisClient.set(socket, scope.sessionId);

        return this;
    };
};

module.exports = new Client();