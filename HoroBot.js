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
