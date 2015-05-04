var app = module.exports = module.parent.exports.setAppDefaults();

// Local includes
var modTattler = require('./tattler');

/** Global ROUTES **/
app.get('/', function(req, res){ res.send(['ok']) });
