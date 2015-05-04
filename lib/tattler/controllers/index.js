var exports = module.exports;
var tattlerModel = require('../models/tattler');
var tattler = function () {
    try {
        return tattlerModel();
    } catch (e) {
        return e;
    }
};


function emit(query) {
    var result = {
        "status": 200,
        "msg": ["ok"]
    };
    var root = query['root'];


    var event = query['event'];
    if (event == undefined) {
        event = 'defaultEvent';
    }

    if (query['room'] == undefined) {
        query['room'] = 'broadcast';
    }

    var room = tattler().io.sockets.server.nsps['/' + root + '/' + query['room']];

    if (room == undefined) {
        result['status'] = 500;
        result['msg'] = "room not found";
    }

    if(room['rawName'] != query['room']) {
        result['status'] = 500;
        result['msg'] = "room name mismatch";
    }

    if (typeof query['bag'] !== 'object') {
        result['status'] = 500;
        result['msg'] = 'query bag is not an object';
    } else {
        if (query['bag']['handler'] == undefined && event == 'defaultEvent') {
            result['status'] = 500;
            result['msg'] = 'handler at queryBag not defined';
        }
    }

    if (result['status'] == 200) {
        //console.log('Emitting to ' + '/' + root + '/' + query['room'], Object.keys(room['server']['sockets']['connected']));
        tattler().io.sockets.in('/' + root + '/' + query['room']).emit(event, query['bag']);
        result['msg'] = {'status': 'ok', 'clients': Object.keys(room['server']['sockets']['connected']).length};
    } else {
        console.error(result);
    }
    return result;

}


exports.getRoot = function (req, res) {
    res.send('Ok');
};

exports.postEmit = function (req, res) {
    // curl -v --header "Content-Type: application/json" -X POST -d '{"root":"crispy21.app", "room":"datatables_languages", "bag": {"handler":"growl", "title":"Тайтл", "text":"Йохохо"} }' http://tattler.app/tattler/emit
    var result = emit(req.body);
    res.status(result['status']).send(result);
};

exports.getEmit = function (req, res) {
    // $.ajax({url:'http://tattler.app/tattler/emit', type: "POST", data: {"root":"crispy21.app", "bag": {"handler":"growl", "title":"Тайтл", "text":"Йохохо"} }, dataType: 'jsonp' });
    var result = emit(req.query);

    res.status(result['status']).send(req.query['callback'] + '(' + JSON.stringify(result['msg']) + ')');
};

exports.postRooms = function (req, res) {
    // join users to rooms
    var query = req.body;
    var socketId = query['client']['socketId'];
    var sessionId = query['client']['sessionId'];

    var client = tattler().makeClient(socketId, sessionId);
    var rooms = tattler().makeRooms(query['root'], query['rooms']);
    var join = tattler().joinRooms(rooms, client.getSocket(socketId));

    //res.send(['ok']);
    res.send({'join': join});

};

exports.getRooms = function (req, res) {
    var result = {};
    var rooms = tattler().getRooms();

    for(var i in rooms) {
        result[i] = Object.keys(rooms[i]);
    }
    res.send(result);
};