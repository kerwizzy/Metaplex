var fs = require("fs")
var path = require("path")
const child_process = require('child_process');
var colors = require('colors');
const pathutils = require("path")

var PROCESS;
var RUNNING = false

var files = []
var dependencyFiles = []

function addFile(path) {
	var mtime = fs.statSync(path).mtime.getTime()
	files.push({path:path,mtime:mtime})
	info('Watching file "'+path+'".')
}

function addDependencyFile(path) {
	var foundFile = false
	for (var i = 0; i<dependencyFiles.length; i++) {
		var file = dependencyFiles[i]
		if (file.path == path) foundFile = true
		
	}
	if (!foundFile) {
		var mtime = fs.statSync(path).mtime.getTime()
		files.push({path:path,mtime:mtime})
		info('Watching file "'+path+'".')	
	}
}

function checkFiles() {
	var changedFiles = []
	for (var i = 0; i<files.length; i++) {
		var file = files[i]
		var mtime = fs.statSync(file.path).mtime.getTime()
		if (mtime != file.mtime) {
			changedFiles.push(file.path)
			file.mtime = mtime
		}
	}
	for (var i = 0; i<dependencyFiles.length; i++) {
		var file = dependencyFiles[i]
		var mtime = fs.statSync(file.path).mtime.getTime()
		if (mtime != file.mtime) {
			changedFiles.push(file.path)
			file.mtime = mtime
		}
	}
	if (changedFiles.length != 0) {
		reexecute(changedFiles);
	}
}



function processStdin(c) {
	if (c[0] = 114) { //ctrl-r
		reexecute()
	}
}

function err(txt) {
	console.error(colors.red(colors.inverse("METAPLEX-WATCH")+"\t"+txt))
}

function info(txt) {
	console.log(colors.cyan(colors.inverse("METAPLEX-WATCH")+"\t"+txt))
}

function debuginfo(txt) {
	console.log(colors.green(colors.inverse("METAPLEX-WATCH")+"\t"+txt))
}

function printProcessRestartInfo() {
console.log(colors.cyan(
		    "--------------------------------------------------------------------------------"+
          "\n                    METAPLEX-WATCH PROCESS RESTART                              "+
		  "\n--------------------------------------------------------------------------------"))
}



var METAPLEX_PATH = pathutils.resolve(__dirname,"metaplex.js")


function reexecute(changedFilePaths) {
	printProcessRestartInfo()
	if (changedFilePaths) {
		info("Changed file(s): "+changedFilePaths.join(", "))
	}
	if (RUNNING) {
		info("Terminiating old process.")
		PROCESS.kill();
	}
	dependencyFiles = [] //Clear the dependency list.
	PROCESS = child_process.fork(process.argv[2],process.argv.slice(3),{stdio:"inherit",execArgv:["-r",__dirname+"/setup.js"].concat(nodeArgs),env:{METAPLEX:METAPLEX_PATH}})
	RUNNING = true
	PROCESS.on("exit",function(code,signal) {
		if (code == 0) {
			info("Process clean exit. Code = "+code+" Signal = "+signal+".")
		} else {
			err("Process error exit. Code = "+code+" Signal = "+signal+".")
		}
		RUNNING = false
	})
	PROCESS.on('message', function(data) {
		parseMessage(data)
	})
}


function parseMessage(msg) {
	var cmd = msg.cmd
	if (cmd == "addDependency") {
		addFile(msg.path)
	}
	
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

if (process.argv[2] == "--help" || process.argv.length < 3) {
	console.log(`A super simple script to watch for changes in a nodejs file and then reexecute it. Designed for use with metaplex. Written by @kerwizzy.
	
	Usage: metaplex-watch [<node arguments>] <path to js file>
	
	Commands:
	ctrl-r: Reexecute the file.
	
	`)
	
} else {
	var nodeArgs = []
	for (var i = 2; i<process.argv.length; i++) {
		if (process.argv[i].substr(0,1) == "-") {
			nodeArgs.push(process.argv[i])
		} else {
			break;
		}
	}
	addFile(path.resolve(process.argv[i]))
	reexecute();
	setInterval(checkFiles,500)
	
	process.stdin.on("data",processStdin)
}