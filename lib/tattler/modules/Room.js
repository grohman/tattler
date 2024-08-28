function Room() {
	'use strict';
    
    
	const self = this;
    const scope = {
        redisClient: null,
        io: null,
        root: null,
        sessionId: null
    };

    this.setRedis = function(redis) { scope.redisClient = redis; return self; };
    this.setIo = function(io) { scope.io = io; return self; };
    this.setRoot = function(root) { scope.root = root; return self; };
    this.setSessionId = function(sessionId) { scope.sessionId = sessionId; return self; };

    this.create = function(roomName) 
    {
        const room = scope.io.of('/' + scope.root + '/' + roomName);

        room.rawName = roomName;
        room.root = scope.root;

        const access = 'tattler:roots:' + scope.sessionId + ':' + roomName;
        scope.redisClient.set(access, scope.root);
        scope.redisClient.expireAt(access, Math.ceil((+new Date)/1000) + 30);

        return roomName;
    };
}


module.exports = new Room();