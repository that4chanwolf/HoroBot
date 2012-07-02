###
 A Node.JS IRC bot, written in CoffeeScript.
 
 Happy hacking
###

# VARIABLES
c = require 'irc-colors'
fs = require 'fs'
irc = require 'irc'
sys = require 'util'
http = require 'http'
parsedData = null
topic = null
title = null
thread = null
extra = null
uname = null
rc = require './config'
modules = require('./modules').modules

# Yup, a section JUST for uname. How fun.
run = (cmd) ->
	_exec = require('child_process').exec
	puts = (error, stdout, stderr) ->
		stdout = stdout.replace /\n$/,''
		uname = stdout
	_exec cmd, puts
run 'uname -r -m -s'

# Function that sets the topic from a JSON object
setTopic = (parsedData) ->
	title = parsedData['title']
	thread = parsedData['thread']
	extra = parsedData['extra']
	topic = title + c.yellow(' || ') + 'Current thread: ' + thread + c.yellow(' || ') + extra
	return

# Function that writes the topic to a file specified in the config,js file
writeTopic = (parsedData) ->
	fs.writeFile rc.Config.topicFile, JSON.stringify(parsedData), () ->
		log 'Wrote topic to ' + rc.Config.topicFile
		return

# Our say function, originally meant to keep the bot non-floody, but since Node.JS is really slow I decided to simply make it a shortcut to send stuff to the channel
say = (message) ->
	client.say rc.Config.channel, message
	return
# This is our way of logging stuff
log = (msg) ->
	date = new Date()
	console.log date + " [-] " + msg
	return
# Our function for checking if a thread 404'd
threadCheck = (thread) ->
	# If the tcheck variable exists, erase it. We don't want multiple checks going on at once.
	clearInterval GLOBAL.tcheck
	# threads(plit) variable
	threads = thread.split '/'
	# The tpath variable isn't being used currently, as I've had issues with it.
	# It currently just exists to make it easier for logging what will be checked
	tpath = '/'+ threads[3] + '/'+ threads[4] + '/' + threads[5]
	log "Setting tpath variable to: #{tpath}"
	tcheck = setInterval (tpath)->
		# HTTP Options
		var hopts =
			host: 'boards.4chan.org',
			port: 80,
			path: '/'+ threads[3] + '/'+ threads[4] + '/' + threads[5]
			method: 'GET'
		# Request our thread path from boards.4chan.org
		request = http.request hopts, (res) ->
			# Log the status code
			log "Status code: #{res.statusCode}"
			if res.statusCode is 404
				# The thread is 404'd, remove the thread and send out a notice
				log "Thread 404'd, clearing tcheck interval"
				finaltopic = {'title':title,'thread':'N/A','extra':extra}
				setTopic finaltopic
				writeTopic finaltopic
				client.notice rc.Config.channel, 'Thread 404\'d!'
				client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
				# Clear the tcheck value
				clearInterval tcheck
		request.end()
	, 20000
	GLOBAL.tcheck = tcheck
	return

# Reads from the topic file and sets the topic
fs.readFile rc.Config.topicFile, (err, data) ->
	log 'Reading topic file'
	throw err if err
	setTopic JSON.parse data if data
	return

# Create a new instance of our IRC client
client = new irc.Client rc.Config.network, rc.Config.nickName,
	userName: rc.Config.userName
	realName: rc.Config.realName
	channels: [rc.Config.channel]

# Being connected is 'registered', for some reason.
client.addListener 'registered', () ->
	log 'Connected!'

# This is mainly for Rizon, if we get a ctcp request, identify ourselves with NickServ
client.addListener 'ctcp', (from) ->
	if from is 'py-ctcp'
		client.say 'NickServ', 'identify ' + rc.Config.NSPassword
		log 'Registered with NickServ!'

# Our big listener thing
# TODO: Figure out away to minimize the code in this
client.addListener 'message', (nick, to, message) ->
	# For making HoroBot interact with the chatroom
	if to is rc.Config.nickName and nick in rc.Config.allowedUsers
		if message.match /^say/
			commandargs = message.replace /^say /,''
			say commandargs
		else if message.match /^act/
			commandargs = message.replace /^act /,''
			client.action rc.Config.channel, commandargs
		else
			client.say nick, "Whispering isn't nice, #{nick}."
	# For adding/deleting the thread
	if message.match /^\$thread/i
		log "THREAD command given"
		commandargs = message.split " "
		# Is the user who sent out the command in our allowedUsers?
		if commandargs[1]? and (nick in rc.Config.allowedUsers) 
			# Does the argument supplied match a url?
			if commandargs[1].match '^https?:\/\/.*'
				log "THREAD ID: " + commandargs[1]
				thread = commandargs[1]
				finaltopic = {'title':title,'thread':thread,'extra':extra}
				setTopic finaltopic
				writeTopic finaltopic
				client.notice rc.Config.channel, 'Thread changed: ' + thread
				client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
				threadCheck thread
			else
				say "Current thread: " + thread
		# No command given/user isn't privledged enough to change the thread
		else
			say "Current thread: " + thread
	# For deleting the thread
	if message.match /^\$del/i
		finaltopic = {'title':title,'thread':'N/A','extra':extra}
		setTopic finaltopic
		writeTopic finaltopic
		client.notice rc.Config.channel, 'Thread changed: ' + thread
		client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
	# For changing the end message of the topic
	if message.match /^\$extra/i
			log "EXTRA command given"
			# Have to do this a little differently than the .thread command
			commandargs = message.replace /^\$extra /,''
			if commandargs? and (nick in rc.Config.allowedUsers)
				extra = commandargs
				finaltopic = {'title':title,'thread':thread,'extra':commandargs}
				setTopic finaltopic
				writeTopic finaltopic
				client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
	# For setting the begining message of the topic
	if message.match /^\$title/i
		log "TITLE command given"
		commandargs = message.replace /^\.title /,''
		if commandargs? and (nick in rc.Config.allowedUsers) 
			title = commandargs
			finaltopic = {'title':title,'thread':thread,'extra':extra}
			setTopic finaltopic
			writeTopic finaltopic
			client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
	# In case SOMEONE fucks up the title
	if message.match /^\$refresh/i
		log 'REFRESH command given'
		finaltopic = {'title':title,'thread':thread,'extra':extra}
		setTopic finaltopic
		writeTopic finaltopic
		client.say 'ChanServ', 'topic ' + rc.Config.channel + ' '+ topic
	# For alerting people 
	if message.match /^\$alert/i
		commandargs = message.replace /^\$alert /,''
		if commandargs is 'ban'
			client.notice rc.Config.channel, 'ALERT: Ban wave! Reset your modems and rev up those proxies!'
		if commandargs is 'cf' or commandargs is 'cloudflare' or commandargs is 'down'
			client.notice rc.Config.channel, 'ALERT: 4chan is down! CloudFlare is being Cloudflare again!'
	# This is for our modules
	for i in rc.Config.modules
		if message.match modules[i][0]
			modules[i][1] client, rc, nick, message
	# Displays our version number
	if message.match /^\$version/i
		say 'HoroBot, version 0.2.1, on '+uname+'. Git repo here: https://gitorious.org/horobot/horobot'
	# Regular old message
	else
		log 'MESSAGE from ' + nick + ', message: ' + message
	return

# Kicks
client.addListener 'kick', (channel, nick, from, reason='No reason') ->
	log 'KICK: nick: ' + nick + ', from: ' + from + ', reason: ' + reason
# Bans
client.addListener 'ban', (channel, nick, from, reason='No reason') ->
	log 'BAN: nick: ' + nick + ', from: ' + from + ', reason: ' + reason
