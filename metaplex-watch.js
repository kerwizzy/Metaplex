var fs = require("fs")
var path = require("path")
const child_process = require('child_process');
var colors = require('colors');

var PROCESS;
var RUNNING = false

if (process.argv[2] == "--help" || process.argv.length < 3) {
	console.log(`A super simple script to watch for changes in a nodejs file and then reexecute it. Designed for use with metaplex. Written by @kerwizzy.
	
	Usage: metaplex-watch <path to js file>
	
	Commands:
	ctrl-r: Reexecute the file.
	
	`)
	
} else {
	var PATH = path.resolve(process.argv[2])
	var LASTMTIME = 0
	setInterval(function() {
		var time = fs.statSync(PATH).mtime.getTime()
		if (time != LASTMTIME) {
			reexecute();
			LASTMTIME = time
		}
	},500)
	
	process.stdin.on("data",processStdin)
}

function processStdin(c) {
	if (c[0] = 114) { //ctrl-r
		reexecute()
	}
}

function err(txt) {
	console.error(colors.red("METAPLEX-WATCH\t"+txt))
}

function info(txt) {
	console.log(colors.cyan("METAPLEX-WATCH\t"+txt))
}

function debuginfo(txt) {
	console.log(colors.green("METAPLEX-WATCH\t"+txt))
}

function printProcessRestartInfo() {
console.log(colors.cyan(
		    "--------------------------------------------------------------------------------"+
          "\n                    METAPLEX-WATCH PROCESS RESTART                              "+
		  "\n--------------------------------------------------------------------------------"))
}


function reexecute() {
	printProcessRestartInfo()
	if (RUNNING) {
		info("Terminiating old process.")
		PROCESS.kill();
	}
	PROCESS = child_process.spawn("node",process.argv.slice(2),{stdio:"inherit"})
	running = true
	PROCESS.on("exit",function(code,signal) {
		if (code == 0) {
			info("Process exit. Code = "+code+" Signal = "+signal+".")
		}
		running = false
	})
}


//THE BELOW TWO FUNCTIONS FROM https://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate
/**
 * Removes a module from the cache
 */
function purgeCache(moduleName) {
    // Traverse the cache looking for the files
    // loaded by the specified module name
    searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(moduleName)>0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

/**
 * Traverses the cache to search for all the cached
 * files of the specified module name
 */
function searchCache(moduleName, callback) {
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        (function traverse(mod) {
            // Go over each of the module's children and
            // traverse them
            mod.children.forEach(function (child) {
                traverse(child);
            });

            // Call the specified callback providing the
            // found cached module
            callback(mod);
        }(mod));
    }
};

function removeExtension(path) {
	path = path.split(".")
	path.pop();
	return path.join(".")
}

function getExtension(path) {
	path = path.split(".")
	return path.pop();
}