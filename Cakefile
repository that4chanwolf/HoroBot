fs = require 'fs'
exec = require('child_process').exec

INPUT = 'script.coffee'
OUTPUT = 'bot.js'
DEBUG = 'debug.txt'

task 'build', 'Builds HoroBot', (options)->
	console.log "Building HoroBot"
	exec "coffee --print #{INPUT}", (err, stdout, stderr) ->
		throw err if err
		fs.writeFile OUTPUT, stdout, (err) ->
			throw err if err
task 'run', 'Builds and runs HoroBot', ->
	invoke 'build'
	console.log "Running HoroBot"
	exec "node #{OUTPUT}", (err, stdout, stderr) ->
		console.log err if err
		console.log stdout if stdout
		console.log stderr if stderr
		return
