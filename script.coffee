###
 A Node.JS IRC bot, written in CoffeeScript.
 
 Happy hacking
###

# VARIABLES
c = require 'irc-colors'
fs = require 'fs'
irc = require 'irc'
sys = require 'util'
parsedData = null
topic = null
title = null
thread = null
extra = null
rc = require './config'

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
        console.log 'Wrote topic to ' + rc.Config.topicFile

# Function that says stuff to the chat, with a slight delay so it isn't so floody
sayLock = false
say = (message) ->
  if !sayLock
      sayLock = true
      setTimeout ->
          client.say rc.Config.channel, message
          sayLock = false
      , 750

# Reads from the topic file and sets the topic
fs.readFile rc.Config.topicFile, (err, data) ->
    console.log 'reading file'
    if err
        throw err
    if data
        console.log data.toString 'utf8'
        setTopic JSON.parse data
        return

# Create a new instance of our IRC client
client = new irc.Client rc.Config.network, rc.Config.nickName,
  userName: rc.Config.userName
  realName: rc.Config.realName
  channels: [rc.Config.channel]

# This is mainly for Rizon, if we get a ctcp request, identify ourselves with NickServ
client.addListener 'ctcp', () ->
    client.say 'NickServ', 'identify ' + rc.Config.NSPassword

# Our big thin, listen up
client.addListener 'message', (nick, to, message) ->
  # For adding/deleting the thread
  if message.match '^\.thread'
    console.log "THREAD command given, saying thread."
    commandargs = message.split " "
    # TODO: Change this long line. Seriously
    if commandargs[1] isnt undefined and (nick is 'that4chanwolf' or nick is 'yttrium' or nick is 'Suiseiseki' or nick is 'Neru' or nick is 'MrFreeman' or nick is 'HarHar' or nick is 'HamHam' or nick is 'ImNinjah') 
        # Does the argument supplied match a url?
        if commandargs[1].match '^https?:\/\/.*'
            console.log "THREAD ID: " + commandargs[1]
            thread = commandargs[1]
            finaltopic = {'title':title,'thread':thread,'extra':extra}
            setTopic finaltopic
            writeTopic finaltopic
            client.notice rc.Config.channel, 'Thread changed: ' + thread
            say '.topic ' + topic
        # Does the argument supplied match 'del' or 'delete'
        else if commandargs[1].match '^del(ete)'
            thread = "N/A"
            finaltopic = {'title':title,'thread':thread,'extra':extra}
            setTopic finaltopic
            writeTopic finaltopic
            client.notice rc.Config.channel, 'Thread over, everyone can go home now.'
            say '.topic ' + topic
        else
            say "Current thread: " + thread
    # No command given/user isn't privledged enough to change the thread
    else
        say "Current thread: " + thread
  # For changing the end message of the topic
  if message.match '^\.extra'
    console.log "EXTRA command given"
    # Have to do this a little differently than the .thread command
    commandargs = message.replace /^\.extra /,''
    console.log "EXTRAS: " + commandargs
    if commandargs isnt undefined
        extra = commandargs
        finaltopic = {'title':title,'thread':thread,'extra':commandargs}
        setTopic finaltopic
        writeTopic finaltopic
        say '.topic ' + topic
  # For setting the begining message of the topic
  if message.match '^\.title'
    console.log "TITLE command given"
    commandargs = message.replace /^\.title /,''
    if commandargs isnt ''
        console.log "TITLE: " + commandargs
        if commandargs isnt undefined
            title = commandargs
            finaltopic = {'title':title,'thread':thread,'extra':extra}
            setTopic finaltopic
            writeTopic finaltopic
            say '.topic ' + topic
  # In case SOMEONE fucks up the title
  if message.match '^\.refresh ?$'
    console.log 'REFRESH command given'
    finaltopic = {'title':title,'thread':thread,'extra':extra}
    setTopic finaltopic
    writeTopic finaltopic
    say '.topic ' + topic
  # Haikus, sigh.
  if message.match '^\.haikus$'
    say 'Go to bed, Haikus.'
  # Neru is about to go to sleep
  if message.match '^\.neru$'
    say 'Neru: Drink a cappuccino, Neru.'
  # <3
  if message.match '^\.squid$' 
    if nick is 'that4chanwolf'
        setTimeout ->
            client.action Config.channel, 'brings ImNinjah into a tight embrace'
        , 750
        setTimeout ->
            client.action Config.channel, "whispers 'I love you' softly into ImNinjah's ear"
        , 1250
        setTimeout ->
            say 'Hey, ImNinjah.'
        , 17000
        setTimeout ->
            say "I'm sorry."
        , 19750
        setTimeout ->
            client.action Config.channel, 'uses Rain Dance'
        , 21000
        setTimeout ->
            client.action Config.channel, 'uses Thunder on ImNinjah'
        , 22000
        setTimeout ->
            client.action Config.channel, 'uses Thunder on ImNinjah'
        , 22500
        setTimeout ->
            client.action Config.channel, 'uses Thunder on ImNinjah'
        , 23000 
        setTimeout -> 
            client.action Config.channel, 'uses Thunder on ImNinjah'
        , 23500
        setTimeout -> 
            client.action Config.channel, 'uses Thunder on ImNinjah'
        , 24000

    else if nick is 'ImNinjah'
        client.action Config.channel, 'eats ImNinjah with a spoon'
    else
        say 'I wish I knew how to kick with the Node.js IRC module, '+nick+'. I really wish I did.'
  # Displays our version number
  if message.match '^\.version'
    # TODO: Use the output of `uname -s -r -i` instead of having it hard coded in
    say 'HoroBot, version 0.1.1, on Darwin 11.0.0 K48AP'
  return
