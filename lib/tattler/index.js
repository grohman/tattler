var router = require('express').Router({mergeParams: true});
var app = module.exports = router;

app.callbacks = require('./controllers/index');
app.socket = require('./modules/tattler');


// routes
app.post('/rooms', app.callbacks.postRooms);

app.get('/emit', app.callbacks.getEmit);
app.post('/emit', app.callbacks.postEmit);