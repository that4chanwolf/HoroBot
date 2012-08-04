/*
 * A Node.JS IRC bot made for managing 4chan threads.
 * Have fun.
 */
var irc = require('irc');
var http = require('http');
var fs = require('fs');
var topic, title, thread, extra;

/* 
 * Loading our config and modules files through fs.readFileSync is better than require, because we can reload our file any time. 
 * It has to be readFileSync because we don't want node continuing on without our required stuff being loaded.
 */
var rc = JSON.parse(fs.readFileSync('config.js', 'utf8'));
var modules = JSON.parse(fs.readFileSync('modules.js', 'utf8'));

/*
 * Our logging function.
 * Spits out the date and the message
 */
var log = function(msg) {
	console.log(new Date() + ' - [!] - ' + msg);
};

/*
 * Our setTopic and writeTopic functions. 
 * Pretty self-explanitory.
 */
var setTopic = function(data) {
	title = data['title'];
	thread = data['thread'];
	extra = data['extra'];
	topic = title + irc.colors.yellow + ' || ' + irc.colors.reset + 'Current Thread: ' + thread + irc.colors.yellow + ' || ' + irc.colors.reset + extra;
};
var writeTopic = function(data) {
	fs.writeFile(rc.topicFile, JSON.stringify(data), function() {
		log('Topic written to file');
	});
};

/*
 * Our thread checker function.
 * It alerts the the chat if a thread 404s, and removes it from the title.
 * Yes, I know global variables are bad, blah blah blah, shut up.
 */
var threadCheck = function(thread) {
	if(GLOBAL.tcheck !== undefined && GLOBAL.tcheck !== null) {
		clearInterval(GLOBAL.tcheck);
	}
	var ts = thread.split('/');
	var tpath = '/' + ts[3] + '/' + ts[4] + '/' + ts[5];
	GLOBAL.tcheck = setInterval(function(tpath) {
		
	}, 30000);
};
