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
 * Loading our config and modules files through fs.readFileSync is better than require, because we can reload our file any time. 
 * It has to be readFileSync because we don't want node continuing on without our required stuff being loaded.
 */
log("Parsing rc file");
var rc = JSON.parse(fs.readFileSync('config.js', 'utf8'));
log("Parsing modules file");
var modules = JSON.parse(fs.readFileSync('modules.js', 'utf8'));


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
			path: '/' + threads[3] + '/' + threads[4] + '/' + threads[5],
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/17.0 Firefox/17.0'
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
		var args = message.replace(/^\$extra /, '');
		var ntopic = {
			'title': args,
			'thread': thread,
			'extra': extra
		};
		setTopic(ntopic);
		writeTopic(ntopic);
		client.say('ChanServ', 'topic ' + rc.channel + ' ' + topic);
	}

});
