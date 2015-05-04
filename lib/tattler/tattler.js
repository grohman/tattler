/*
*
*
 https://www.websequencediagrams.com/

 title tattler
 User->Crispy: Get WS, get passport
 note right of User: ajax
 note left of Crispy: remember passport at session
 User->Ws: connect
 note left of Ws: get socketId
 User->Crispy: send rooms request + passport (socketId+sessionId)
 note right of User: ajax
 note right of Crispy: validate rooms access
 Crispy->Ws: store passport+socketId, make rooms
 Ws->User: join rooms
 User->Ws: comminucate

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