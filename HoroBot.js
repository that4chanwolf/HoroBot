/*
 * A Node.JS IRC bot made for managing 4chan threads.
 * Have fun.
 */
var irc = require('irc');
var http = require('http');
var fs = require('fs');
var topic, title, thread, extra;

/*
 * Our logging function.
 * Spits out the date and the message
 */
var log = function(msg) {
	console.log(new Date() + ' - [!] - ' + msg);
};

/*
 * A cool little function that removes an item from an array.
 * Found on http://ejohn.org/blog/javascript-array-remove/
 */
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

/* 
 * Loading our config file through fs.readFileSync is better than require, because we can reload our file any time.
 * It has to be readFileSync because we don't want node continuing on without our required stuff being loaded.
 * On the other hand, JSON doesn't seem to be a fan of Regular Expressions, and I managed to cripple all of my modules I made, so we need to use require().
 * Lesson learned: Test your shit more rigourously before you push a commit.
 */
log("Parsing rc file");
var rc = JSON.parse(fs.readFileSync('config.js', 'utf8'));
log("Parsing modules file");
var modules = require('./modules').modules;


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
	log("tpath variable is now " + tpath);
	GLOBAL.tcheck = setInterval(function(tpath) {
		var hopts = {
			host: 'boards.4chan.org',
			port: 80,
			path: tpath,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozerella/13.37 (X12; Gahnoo/Loonix x86_64; rv:27.0) Gookeh/27.0 Furryfox/27.0'
			}
		};
		var request = http.request(hopts, function(res) {
			if(res.statusCode === 404) {
				log("Thread 404'd, clearing tcheck interval");
				var ntopic = {
					'title': title,
					'thread': 'N/A',
					'extra': extra
				};
				setTopic(ntopic);
				writeTopic(ntopic);
				client.notice(rc.channel, "Thread 404'd!");
				client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
				clearInterval(GLOBAL.tcheck);
			}
		});
		request.end();
	}, 30000);
};

/*
 * Read our topic file
 */
fs.readFile(rc.topicFile, function(err, data) {
	if(err) throw err;
	if(data) {
		setTopic(JSON.parse(data.toString('utf8')));
	}
});

/*
 * Set up our irc client
 */
var client = new irc.Client(rc.network, rc.nickName, {
	userName: rc.userName,
	realName: rc.realName,
	channels: [rc.channel]
});

/*
 * Register ourselves with NickServ when we connect.
 */
client.addListener('registered', function() {
	log("Connected!");
	client.say('NickServ', 'identify ' + rc.NSPassword);
	log("Registered with NickServ");
});

/*
 * Here are all our base functions.
 * $thread - Sets the current thread.
 * $del - Deletes the current thread.
 * $extra - Sets the extra text that goes at the end of the topic
 * $title - Sets the begining text that is the 'intro' to the channel
 * $alert - Sends an alert to the channel
 * $version - Sends HoroBot's version to the channel
 */
client.addListener('message', function(nick, to, message) {
	log(nick + ", " + to + ", " + message);
	if( message.match(/^\$thread/) ) {
		var args = message.split(' ');
		if( args[1] && rc.allowedUsers.indexOf(nick) !== -1 ) {
			if( args[1].match( /^https?:\/\/.*/ ) ) {
				log('New thread: ' + args[1]);
				var ntopic = {
					'title': title,
					'thread': args[1],
					'extra': extra
				};
				setTopic(ntopic);
				writeTopic(ntopic);
				client.notice(rc.channel, 'Thread changed: ' + thread);
				client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
				threadCheck(thread);
			} else {
				client.say(rc.channel, 'Current thread: ' + thread);
			}
		} else {
			client.say(rc.channel, 'Current thread: ' + thread);
		}
	} else if( message.match(/^\$del ?$/) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var ntopic = {
			'title': title,
			'thread': 'N/A',
			'extra': extra
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.notice(rc.channel, 'Thread deleted');
		client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
		if(GLOBAL.tcheck !== undefined && GLOBAL.tcheck !== null) {
			clearInterval(GLOBAL.tcheck);
		}
	} else if( message.match(/^\$extra /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$extra /, '');
		var ntopic = {
			'title': title,
			'thread': thread,
			'extra': args
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
	} else if( message.match(/^\$title /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$title /, '');
		var ntopic = {
			'title': args,
			'thread': thread,
			'extra': extra
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
	} else if( message.match(/^\$alert /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$alert /, '');
		client.notice(rc.channel, 'ALERT: ' + args);
	} else if( message.match(/^\$version ?/) ) {
		client.say(rc.channel, 'HoroBot version 0.3.1. Git repo here: https://github.com/that4chanwolf/horobot');
	}
	for( var _i = 0; _i < rc.modules.length; _i++ ) {
		var i = rc.modules[_i];
		if(message.match(modules[i][0])) {
			modules[i][1](client, rc, nick, message);
		}
	}
});

/*
 * Admin functions
 * Made for managing HoroBot not completely pants-on-head restart-everytime-you-want-to-add-a-user retarded
 * $refresh - Refreshes config file, topic, and thread checker * Doesn't require admin privledges
 * $au - Adds a user to the allowedUser list
 * $ru - Removes a user from the allowedUser list
 * $aa - Adds a user to the admin list
 * $ra - Removes a user from the admin list
 */
client.addListener('message', function(nick, to, message) {
	if( message.match(/^\$refresh ?$/) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		// We don't have to wory about other things continuing before our config is ready, so it's time for ASYNC ACTION
		fs.readFile('config.js', function(err, data) {
			if( err ) {
				client.say(rc.channel, "There was an error reading/parsing the configuration file, shutting down...");
				var msg = err.split("\n");
				for(i in msg) {
					log(msg[i]);
				}
				process.exit(1);
			} else if( data ) {
				rc = JSON.parse(data.toString('utf8'));
				log("Configuration reloaded successfully");
			}
		});
		// Read our topic file
		fs.readFile(rc.topicFile, function(err, data) {
			if(err) throw err;
			if(data) {
				setTopic(JSON.parse(data.toString('utf8')));
			}
		});
		client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
		if( thread.match( /^https?:\/\/.*/ ) ) {
			threadCheck(thread);
		}
	} else if( message.match(/^\$au /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ")[1];
		rc.allowedUsers.push(args);
		fs.writeFile('config.js', JSON.stringify(rc, null, "\t"), function(err, saved) {
			if( err ) {
				client.say(rc.channel, "There was an error writing the configuration file, shutting down...");
				var msg = err.split("\n");
				for(i in msg) {
					log(msg[i]);
				}
				process.exit(1);
			}
		});
	} else if( message.match(/^\$ru /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ")[1];
		if( rc.allowedUsers.indexOf(args) !== -1 ) {
			rc.allowedUsers.remove(rc.allowedUsers.indexOf(args));
		}		
		fs.writeFile('config.js', JSON.stringify(rc, null, "\t"), function(err, saved) {
			if( err ) {
				client.say(rc.channel, "There was an error writing the configuration file, shutting down...");
				var msg = err.split("\n");
				for(i in msg) {
					log(msg[i]);
				}
				process.exit(1);
			}
		});
	} else if( message.match(/^\$aa /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ")[1];
		rc.admins.push(args);
		rc.allowedUsers.push(args);
		fs.writeFile('config.js', JSON.stringify(rc, null, "\t"), function(err, saved) {
			if( err ) {
				client.say(rc.channel, "There was an error writing the configuration file, shutting down...");
				var msg = err.split("\n");
				for(i in msg) {
					log(msg[i]);
				}
				process.exit(1);
			}
		});
	} else if( message.match(/^\$ra /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ")[1];
		if( rc.allowedUsers.indexOf(args) !== -1 && rc.admins.indexOf(args) !== -1 ) {
			rc.allowedUsers.remove(rc.allowedUsers.indexOf(args));
			rc.admins.remove(rc.admins.indexOf(args));
		}
		fs.writeFile('config.js', JSON.stringify(rc, null, "\t"), function(err, saved) {
			if( err ) {
				client.say(rc.channel, "There was an error writing the configuration file, shutting down...");
				var msg = err.split("\n");
				for(i in msg) {
					log(msg[i]);
				}
				process.exit(1);
			}
		});	
	}
});
