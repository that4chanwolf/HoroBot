/*
* MODULES LAYOUT:
* exports.modules = {
* 	moduleName: [
* 		/^\$regex/,
* 		// NOTE: You are required to pass in the `client` and `rc` arguments as part of your module
* 		function(args) {
* 			client.command(arg1, arg2);
* 		}
* 	]
* }
* Also, Suiseiseki is a trap.
*/

exports.modules = {
	//Example: Pet a person at random
	pets: [
		//,
		function(client, rc, nick) {
			if( Math.floor( Math.random()*101 ) < 12 ) {
				client.action(rc.channel, 'pets ' + nick);
			}
		}
	]
};
