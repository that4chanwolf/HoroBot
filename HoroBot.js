/*
 * A Node.JS IRC bot made for managing 4chan threads.
 * Have fun.
 */
 
// Include required things, like the IRC module, HTTP module, and file system module
var irc = require('irc');
var http = require('http');
var fs = require('fs');
// Create empty variables for the topic, title, thread, and extra stuff
var topic, title, thread, op, extra, posts;

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
	op = data['op'] || 'N/A';
	topic = title + irc.colors.codes.yellow + ' || ' + irc.colors.codes.reset + 'Current Thread: ' + thread + irc.colors.codes.yellow + ' || ' + irc.colors.codes.reset + 'OP: ' + op + irc.colors.codes.yellow + ' || ' + irc.colors.codes.reset + extra;
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
	clearInterval(GLOBAL.tcheck); // Clear the interval
	threads = thread.split('/');
	tpath = '/' + threads[3] + '/' + threads[4] + '/' + threads[5] + '.json'; // The pathname, looks something like /g/res/83284939999.json
	log("Setting tpath variable to: " + tpath);
	tcheck = setInterval(function(tpath) {
		// Set out HTTP options
		var hopts = {
			host: 'api.4chan.org',
			port: 80,
			path: '/' + threads[3] + '/' + threads[4] + '/' + threads[5] + '.json',
			method: 'GET',
			headers: {
				'User-Agent': 'Mozerella/13.37 (X12; Gahnoo/Loonix x86_64; rv:27.0) Gookeh/27.0 Furryfox/27.0' // lol so fahnny user agent
			}
		};
		var request = http.request(hopts, function(res) {
			var finaltopic, data;
			log("Status code: " + res.statusCode);
			if (res.statusCode === 404) { // 404
				log("Thread 404'd, clearing tcheck interval");
				finaltopic = {
					'title': title, 
					'thread': 'N/A', // Thread is nonexistant
					'op': 'N/A',
					'extra': extra
				};
				setTopic(finaltopic);
				writeTopic(finaltopic);
				client.notice(rc.channel, 'Thread 404\'d!'); // Send notice to the channel
				client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8'); // Write to the topic
				clearInterval(tcheck); // Clear the interval
			} else if(res.statusCode === 200) { // 200 OK
				res.on('data', function(chunk) {
					data = data + chunk;
				});
				res.on('end', function() {
					// Shitty work around for parsing this shit
					fs.writeFile('thedata', data, function() {
						fs.readFile('thedata', function(err, ndata) {
							if(err) {
								throw err;
							}
							if(ndata) {
								posts = JSON.parse(ndata);
								op = posts['posts'][0].name;
								finaltopic = {
									'title': title,
									'thread': thread,
									'op': op || 'Anonymous',
									'extra': extra
								};
								setTopic(finaltopic);
								writeTopic(finaltopic);
								client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8'); // Write to the topic
							}
						});
					});
				});
			}
		});
		request.end();
	}, 30000);
	GLOBAL.tcheck = tcheck;
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
		if( args[1] && rc.allowedUsers.indexOf(nick) !== -1 ) { // If the user is in the allowedUsers
			if( args[1].match( /^https?:\/\/.*/ ) ) {       // And the next argument matches a URL
				log('New thread: ' + args[1]);
				var ntopic = {
					'title': title,
					'thread': args[1],
					'extra': extra
				};
				setTopic(ntopic);
				writeTopic(ntopic);
				client.notice(rc.channel, 'Thread changed: ' + thread);
				client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8');
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
			'op': 'N/A',
			'extra': extra
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.notice(rc.channel, 'Thread deleted');
		client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8');
		if(GLOBAL.tcheck !== undefined && GLOBAL.tcheck !== null) { // Makes sure it doesn't try and clear an interval that doesn't exist
			clearInterval(GLOBAL.tcheck);
		}
	} else if( message.match(/^\$extra /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$extra /, '');
		var ntopic = {
			'title': title,
			'thread': thread,
			'op': op,
			'extra': args
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8');
	} else if( message.match(/^\$title /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$title /, '');
		var ntopic = {
			'title': args,
			'thread': thread,
			'op': op,
			'extra': extra
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8');
	} else if( message.match(/^\$alert /) && rc.allowedUsers.indexOf(nick) !== -1 ) {
		var args = message.replace(/^\$alert /, '');
		client.notice(rc.channel, 'ALERT: ' + args);
	} else if( message.match(/^\$version ?/) ) {
		client.say(rc.channel, 'HoroBot version 0.3.1. Git repo here: https://github.com/that4chanwolf/horobot');
	}
	for( var _i = 0; _i < rc.modules.length; _i++ ) { // Loop through all our modules
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
		client.conn.write('TOPIC ' + rc.channel + ' :' + topic + '\r\n', 'utf8'); 
		if( thread != 'N/A' ) {
			threadCheck(thread);
		}
	} else if( message.match(/^\$au /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" "); 
		args.splice(0, 1); // Slice off the first part
		for(var i = 0; i < args.length; i++ ) {
			if( args[i] !== "" ) {
				rc.allowedUsers.push(args[i]);
			}
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
	} else if( message.match(/^\$ru /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ");
		args.splice(0, 1);
		for(var i = 0; i < args.length; i++ ) {
			if( rc.allowedUsers.indexOf(args[i]) !== -1 && args[i] !== "" ) {
				rc.allowedUsers.remove(rc.allowedUsers.indexOf(args[i]));
			}		
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
		var args = message.split(" ");
		args.splice(0, 1)
		for(var i = 0; i < args.length; i++ ) {
			if( args[i] !== "" ) {
				rc.admins.push(args[i]);
				rc.allowedUsers.push(args[i]);
			}
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
	} else if( message.match(/^\$ra /) && rc.admins.indexOf(nick) !== -1 ) {
		var args = message.split(" ");
		args.splice(0, 1);
		for( var i = 0; i < args.length; i++ ) {
			if( rc.allowedUsers.indexOf(args[i]) !== -1 && rc.admins.indexOf(args[i]) !== -1 && args[i] !== "" ) {
				rc.allowedUsers.remove(rc.allowedUsers.indexOf(args[i]));
				rc.admins.remove(rc.admins.indexOf(args[i]));
			}
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
