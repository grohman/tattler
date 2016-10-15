var exports = module.exports;

exports.getIndex = function (req, res) {
    var context = {};
    context.layout = null;
    context.base_url = require("config").app.base_url || req.protocol + "://" + req.headers.host;

    var template = __dirname + '/../views/index';

    res.set('Content-Type', 'application/json');

    return res.status(200).render(template, context);
};