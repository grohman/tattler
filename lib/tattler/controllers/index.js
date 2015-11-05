var exports = module.exports;
var tattlerModel = require('../models/tattler');
var tattler = function () {
    try {
        return tattlerModel();
    } catch (e) {
        return e;
    }
};


function emit(query, callback) {
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

    return tattler().roomExists(root, query['room'], function (exists) {
        if (exists == false) {
            result['status'] = 500;
            result['msg'] = "room not found";
            result['room'] = '/' + root + '/' + query['room'];
        } else {
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
                //console.log('Emitting to ' + '/' + root + '/' + query['room']);//
                tattler().io.sockets.in('/' + root + '/' + query['room']).emit(event, query['bag']);
                result['msg'] = {'status': 'ok'};
            } else {
                console.error(result);
            }
        }
        if(typeof callback == 'function'){
            callback(result);
        }
        return result;
    });
}


exports.getRoot = function (req, res) {
    res.send('Ok');
};

exports.postEmit = function (req, res) {
    // curl -v --header "Content-Type: application/json" -X POST -d '{"root":"RvQTnn6hFikrspy7HEUS", "room":"datatables_languages", "bag": {"handler":"growl", "title":"Тайтл", "text":"Йохохо"} }' http://tattler.app/tattler/emit
    emit(req.body, function(result){
        res.status(result['status']).send(result);
    });
};

exports.getEmit = function (req, res) {
    // $.ajax({url:'http://tattler.app/tattler/emit', type: "POST", data: {"root":"crispy21.app", "bag": {"handler":"growl", "title":"Тайтл", "text":"Йохохо"} }, dataType: 'jsonp' });
    emit(req.query, function(result){
        res.status(result['status']).send(req.query['callback'] + '(' + JSON.stringify(result) + ')');
    });
};

exports.postRooms = function (req, res) {
    // make clients and rooms
    console.log('postRooms', req);
    var query = req.body;
    var socketId = query['client']['socketId'];
    var sessionId = query['client']['sessionId'];

    // console.log('new client', socketId, sessionId)
    var client = tattler().makeClient(socketId, sessionId);
    var rooms = tattler().makeRooms(query['root'], query['rooms'], sessionId);

    //res.send(['ok']);
    res.send({'rooms': rooms});

};

exports.getRooms = function (req, res) {
    var result = {};
    var rooms = tattler().getRooms();

    for (var i in rooms) {
        result[i] = Object.keys(rooms[i]);
    }
    res.send(result);
};