/*
*
*
 https://www.websequencediagrams.com/

 title Tattler
 User->Php: Get WS, set sessionId
 note right of User: ajax
 note left of Php: remember sessionId
 User->Ws: connect
 note left of Ws: get socketId
 User->Php: send rooms request + socketId + sessionId
 note right of User: ajax
 note left of Php: validate rooms access
 Php->Ws: store sessionId+socketId, make rooms
 Ws->User: join rooms
 User->Ws: dance

* */


var app = module.exports = module.parent.exports.setAppDefaults();

app.callbacks = require('./controllers/index');
app.socket = require('./models/tattler');

// routes
app.get('/', app.callbacks.getRoot);
app.get('/rooms', app.callbacks.getRooms);
app.post('/rooms', app.callbacks.postRooms);

app.post('/emit', app.callbacks.postEmit);
app.get('/emit', app.callbacks.getEmit);