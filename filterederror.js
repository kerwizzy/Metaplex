var pathutils = require("path")

class FilteredError {
	constructor(msg) {
		this.message = msg
		this.error = new Error(this.message)
		this.rawStack = this.error.stack
		this.parseStack();
		this.filter(frame => frame.path != __filename)
	}
	
	parseStack() {
		var split = this.rawStack.split("\n")
		var parsed = []
		for (var i = 1; i<split.length; i++) {
			var out = {}
			
			var line = split[i]
			var startToken = "at "
			var frameStart = line.indexOf(startToken)
			var data = line.substr(frameStart+startToken.length)
			out.text = data
			var lastParen = data.lastIndexOf(")")
			if (lastParen == -1 || lastParen != data.length-1) { //if there are no parens or the parens are somewhere else (e.g., in a filename), then it is probably in the format "location" instead of "functionName (location)"
				var location = data
			} else {
				var locationStart = findMatchingParen(data,lastParen)
				var location = data.substr(locationStart+1,lastParen-locationStart-1)
				out.func = data.substr(0,locationStart-1)
			}
			
			out.location = location
			
			var splitLocation = location.split(":")
			var column = splitLocation.pop()
			var line = splitLocation.pop()
			var path = splitLocation.join(":")
			
			out.column = column
			out.line = line
			out.path = path
			
			if (location == "native") {
				out.type = "native"
			} else if (!pathutils.isAbsolute(location)) {
				out.type = "node"
			} else {
				out.type = "user"
			}
			
			
			parsed.push(out)
		}
		this.parsedStack = parsed
	}
	
	filter(func) {
		this.parsedStack = this.parsedStack.filter(func)
	}
	
	get stack() {
		var out = "Error: "+this.message
		for (var i = 0; i<this.parsedStack.length; i++) {
			var frame = this.parsedStack[i]
			out += "\n     at "
			if (frame.func) {
				out += frame.func+" ("+frame.location+")"
			} else {
				out += frame.location
			}
		}
		return out
	}
}

function findMatchingParen(str,i) { //starts from the given index and works backwards
	var level = 1;
	i--
	while (level > 0 && i >= 0) {
		var c = str.substr(i,1)
		if (c == ")") {
			level++
		} else if (c == "(") {
			level--
		}
		i--
	}
	return i+1
}

module.exports = FilteredError