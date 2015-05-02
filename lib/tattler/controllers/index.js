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

    var room;

    var rooms = tattler().rooms;

    var event = query['event'];
    if (event == undefined) {
        event = 'defaultEvent';
    }

    if (query['room'] == undefined) {
        room = rooms[root]['broadcast'];
    } else {
        room = rooms[root][query['room']];
    }

    if (room == undefined) {
        result['status'] = 500;
        result['msg'] = "room not found";
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
        tattler().io.to(room).emit(event, query['bag']);
        result['msg'] = {'status': 'ok', 'clients': tattler().getRoomsClients()[room['rawName']].length};
    }
    return result;

}


exports.getRoot = function (req, res) {
    res.send('Ok');
};

exports.getRooms = function (req, res) {
    var result = {};
    var all = tattler().rooms;
    var halls = Object.keys(all);
    for(var i in halls){
        if(result[halls[i]] == undefined){
            result[halls[i]] = [];
        }
        for(var y in all[halls[i]]) {
            result[halls[i]].push(all[halls[i]][y]['rawName']);
        }
    }
    res.send(result);
};

exports.getRoomsClients = function (req, res) {
    res.send(tattler().getRoomsClients())
};

exports.getClients = function (req, res) {
    res.send(tattler().getClients());
};

exports.getClientsSessions = function (req, res) {
    res.send(tattler().getClientsSessions());
}

exports.getSessions = function (req, res) {
    res.send(tattler().getSessions());
}


exports.postEmit = function (req, res) {
    // curl -v --header "Content-Type: application/json" -X POST -d '{"root":"crispy21.app", "room":"settings", "bag": {"handler":"growl", "title":"Тайтл", "text":"Йохохо"} }' http://tattler.app/tattler/emit
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
    var join = tattler().joinRooms(query['root'], rooms, query['client']);

    res.send({'client': client, 'rooms': rooms, 'join': join});

};

exports.postClients = function (req, res) {
    var query = req.body;
    var result = tattler().makeClient(query['socketId'], query['sessionId']);
    res.send({'message': 'storedPassport', 'socketId': query['socketId'], 'sessionId': query['sessionId']});
}