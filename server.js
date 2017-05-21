var cluster = require('cluster');
require('app-module-path').addPath(__dirname + '/lib');

if (cluster.isMaster) {
	require('tattler/master');
} else {
	require('tattler/instance');
}