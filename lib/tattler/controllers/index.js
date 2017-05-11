var exports = module.exports;
var tattlerModel = require('../modules/tattler');

var tattler = function () {
    try {
        return tattlerModel();
    } catch (e) {
        return e;
    }
};

function isValidSecret(secret) {
	var conf = require('config');
	return secret === conf.jwt.token;
}

function emit(query, callback) {
    var result = {
        status: 200,
        msg: null
    };
    var root = query.root;

    var event = query.event || 'defaultEvent';

    if (typeof query.room === 'undefined') {
        query.room = 'broadcast';
    }

    return tattler().roomExists(root, query['room'], function (exists) {
        if (exists === false) {
            result.status = 500;
            result.msg = "room not found";
            result.room = '/' + root + '/' + query['room'];
        } else {
            /** @namespace query.bag */
            if (typeof query.bag !== 'object') {
                result.status = 500;
                result.msg = 'query bag is not an object';
            } else {
                if (typeof query.bag.handler === 'undefined') {
                    result.status = 500;
                    result.msg = 'handler at queryBag not defined';
                }
            }

            if (result.status === 200) {
                tattler().io.sockets.in('/' + root + '/' + query['room']).emit(event, query['bag']);
                result.msg = {status: 'ok'};
            } else {
                console.error(result);
            }
        }
        if (typeof callback === 'function') {
            callback(result);
        }
        return result;
    });
}


exports.postEmit = function (req, res) {
    if (!isValidSecret(req.body.secret))
    {
        return res.status(403);
    }
    
    // curl -v --header "Content-Type: application/json" -X POST -d '{"root":"RvQTnn6hFikrspy7HEUS", "secret": "this_is_not_my_secret_token", "room":"broadcast", "bag": {"handler":"console.log", "namespace":"global", "message":"Ahoy"} }' http://tattler.app/tattler/emit
    emit(req.body, function (result) {
        res.status(result.status).send(result);
    });
};

exports.getEmit = function (req, res) {
	if (!isValidSecret(req.body.secret))
	{
		return res.status(403);
	}
	
    // $.ajax({url:'http://tattler.app/tattler/emit', type: "GET", data: {"root":"RvQTnn6hFikrspy7HEUS", "secret": "this_is_not_my_secret_token", "room":"broadcast", "bag": {"handler":"console.log", "namespace":"global", "message":"Ahoy"} }, dataType: 'jsonp' });
    emit(req.query, function (result) {
        res.status(result.status).send(req.query['callback'] + '(' + JSON.stringify(result) + ')');
    });
};

exports.postRooms = function (req, res) {
	if (!isValidSecret(req.body.secret))
	{
		return res.status(403);
	}
	
    // make clients and rooms
    var query = req.body;

    /** @namespace query.client */
    tattler().makeClient(query.client.socketId, query.client.sessionId);

    var rooms = tattler().makeRooms(query.root, query.rooms, query.client.sessionId);

    res.send({rooms: rooms});
};

exports.getRooms = function (req, res) {
    var result = {};
    var rooms = tattler().getRooms();

    for (var i in rooms) {
        if (rooms.hasOwnProperty(i)) {
            result[i] = Object.keys(rooms[i]);
        }
    }
    res.send(result);
};