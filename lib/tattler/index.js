var router = require('express').Router({ mergeParams: true });
var app = module.exports = router;


app.controllers = {
  index: require('./controllers/index')
};

// socket = require('./models/tattler');

router.get('/', app.controllers.index.getIndex);
