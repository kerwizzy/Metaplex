const fs = require("fs")
const path = require("path")
const colors = require("colors")


var headers = []


var operators = {
	"translate":{
		args:[0,0,0,1]
		,parse:function(x,y,z,ob) {
			return "translate(["+x+","+y+","+z+"]) "+ob
		}
	}
	,"rotate":{
		args:[0,0,0,1]
		,parse:function(x,y,z,ob) {
			return "rotate(["+x+","+y+","+z+"]) "+ob
		}
	}
	,"scale":{
		args:[0,0,0,1]
		,parse:function(x,y,z,ob) {
			return "scale(["+x+","+y+","+z+"]) "+ob
		}
	}
	,"rotate_extrude":{
		args:[0,0,1]
		,parse:function(angle,convexity,ob) {
			if (angle != 360) {
				return "rotate_extrude(angle="+angle+",convexity="+convexity+") "+ob
			} else {
				return "rotate_extrude(convexity="+convexity+") "+ob
			}
		}
	}
	,"linear_extrude":{
		args:[0,0,0,0,1]
		,parse:function(height,convexity,twist,scale,ob) {
			return "linear_extrude(height = "+height+",convexity="+convexity+",twist="+twist+",scale="+scale+") "+ob
		}		
	}
	,"rotz":{
		args:[0,1]
		,parse:function(z,ob) {
			return "rotate("+z+") "+ob
		}
	}
	,"cylinder":{
		args:[0,0]
		,parse:function(h,r) {
			return "cylinder("+h+",r="+r+")"
		}
	}
	,"cone":{
		args:[0,0,0]
		,parse:function(h,r1,r2) {
			return "cylinder("+h+","+r1+","+r2+")"
		}
	}
	,"cube":{
		args:[0,0,0]
		,parse:function(s) {
			return "cube("+s+")"
		}
	}
	,"box":{
		args:[0,0,0]
		,parse:function(w,d,h) {
			return "cube(["+w+","+d+","+h+"])"
		}
	}
	,"sphere":{
		args:[0]
		,parse:function(r) {
			return "sphere("+r+")"
		}
	}
	,"circle":{
		args:[0]
		,parse:function(r) {
			return "circle("+r+")"
		}
	}
	,"polygon":{
		args:[0]
		,parse:function(obj) {
			obj = JSON.parse(obj)
			return "polygon("+JSON.stringify(obj.points)+")"
		}
	}
	,"&":{
		args:[1,1]
		,parse:function(ob1,ob2) {
			return "intersection() {\n"+ob1+"\n"+ob2+"\n}"
		}
	}
	,"$fn":{
		args:[0]
		,parse:function(fn) {
			return "$fn = "+fn
		}
	}
	,"threads_dk":{
		args:[0,0,0,0]
		,parse:function(radius,pitch,length,options) {
			addDependency("threads.scad")
			var options = JSON.parse(options)
			var keys = Object.keys(options)
			var out = "metric_thread("+radius*2+","+pitch+","+length
			for (var i = 0; i<keys.length; i++) {
				out += ","+keys[i]+"="+options[keys[i]]
			}
			out += ")"
			return out
		}
	}
}

function addDependency(name) {
	var dependency = "use <"+path.resolve(path.dirname(process.argv[1]),"./openscad_modules/"+name)+">"
	if (headers.indexOf(dependency) == -1) {
		headers.push(dependency)
	}	
}


function parseline(line,linenum,recursiveformat) {//line must be a string
	if (debug) {
		debuginfo("PARSING LINE: "+line)
	}
	var str
	var len
	if (line.substr(0,1) == "{") {
		str = parse(line.substr(1,line.length-2))
		len = tokenize(line).length //TODO: this len value takes the WHOLE line. Thus won't work if have multiple subblocks.
	} else {
		line= tokenize(line)		
		var cmd = line[0]
		var l = 1;
		if (operators[cmd]) {
			var op = operators[cmd]
			var argtypes = op.args;
			var args = []
			for (var i = 0; i<argtypes.length; i++) {
				var type = argtypes[i]
				if (type == 0) {
					args.push(line[l])
					l++
				} else if (type == 1) {
					var subparsedData = parseline(untokenize(line.slice(l)),linenum,true)
					var subparsedStr = subparsedData.str
					var subparsedLen = subparsedData.len
					l += subparsedLen
					args.push(subparsedStr)
				}
			}
			
			str = op.parse.apply(null,args)
		} else {
			err(linenum,"Operator or primitive "+cmd+" is not currently supported. Aborting. line = "+line)
			process.exit();
		}
	}
	if (recursiveformat) {
		return {len:l,str:str}
	} else {
		return str
	}
}

function tokenize(str) {
	return str.split(" ")
}

function untokenize(str) {
	return str.join(" ")
}

function err(ln,str) {
	console.error(colors.red("SCAD EXPORT\t"+" line "+ln+": "+str))
}

function debuginfo(str) {
	console.log(colors.green("SCAD EXPORT\t"+str))
}



function parse(data,isRoot) { //isParent is only true if this is the root call in the recursive parse tree
	var lines = splitData(data);
	
	if (debug) {
		debuginfo("LINES")
		debuginfo("\\n\t"+lines.join("\n\\n\t"))
		debuginfo("-----------------------")
	}
	
	var out_union = []
	var out_difference = []
	var out_intersection = []
	var resForNextLine = []
	var resolution = ""
	for (var i = 0; i<lines.length; i++) {
		var line = lines[i]
		if (line.match(/\S/g)) {
			var type = line.substr(0,1)
			var ln = i+1
			
			var groupToPushTo;
			var toPush;
			if (type == "-") {
				groupToPushTo = out_difference
				toPush = parseline(line.substr(2),ln)
			} else if (type == "+") {
				groupToPushTo = out_union
				toPush = parseline(line.substr(2),ln)
			} else if (type == "&") {
				groupToPushTo = out_intersection
				toPush = parseline(line.substr(2),ln)
			} else if (type == "$") {
				var resData = parseline(line,ln)
				if (i == 0) {
					resolution = resData+"\n"
				} else {
					resForNextLine.push(resData)
				}
			} else {
				groupToPushTo = out_union
				toPush = parseline(line,ln)
			}
			if (toPush) {
				if (resForNextLine) {
					for (var j = 0; j<resForNextLine.length; j++) {
						groupToPushTo.push(resForNextLine[j])
					}
					resForNextLine = []
				}
				groupToPushTo.push(toPush)
			}
		}
	}
	
	var union = out_union.length != 0
	var intersection = out_intersection.length != 0
	var difference = out_difference.length != 0
	
	var out = resolution;
	if (isRoot) {
		out += "\n"+headers.join("\n")+"\n"
	}
	if (union && !intersection && !difference) {
		out += "union() {\n"+out_union.join("\n")+"\n}"
	} else if (!union && intersection && !difference) {
		out += "intersection() {\n"+out_intersection.join("\n")+"\n}"
	} else if (!union && !intersection && difference) {
		out += "difference() {\n"+out_difference.join("\n")+"\n}"
	} else if (union && !intersection && difference) {
		out += "difference() {\nunion() {\n"+out_union.join("\n")+"\n}\n"+out_difference.join("\n")+"\n}"
	} else {
		out += "intersection() {\ndifference() {\nunion() {\n"+out_union.join("\n")+"\n}\n"+out_difference.join("\n")+"\n}\n"+out_intersection.join("\n")+"\n}";
	}
	
	

	out = out.split("\n");
	for (var i = 0; i<out.length; i++) {
		var lastChar = out[i].substr(-1)
		if (!lastChar.match(/[{}\s;<>]/g) && out[i].length != 0) {
			out[i] += ";"
		}
	}
	return out.join("\n")
}

function splitData(d) {
	var i = 0; 
	var mode = 0; //0 = basic parse, 1 = in sub block
	var l =0;
	var lines = [""]
	var counter = 0;
	for (var i = 0; i<d.length; i++) {
		var c = d[i]
		if (mode == 0) {
			if (c == "\n") {
				l++
				lines[l] = ""
			} else if (c == "{") {
				counter++
				lines[l] += c
				mode = 1
			} else {
				lines[l] += c
			}
		} else if (mode == 1) {
			lines[l] += c
			if (c == "}") {
				counter--
				if (counter == 0) {
					l++
					lines[l] = ""
					mode = 0
				}
			} else if (c == "{") {
				counter++
			}
		}
	}
	return lines
}

const DEFAULT_OPTIONS = {
	debug:false	
}

function initparse(data,options) {
	options = combineOptionsListWithDefaults(options,DEFAULT_OPTIONS)
	debug = options.debug
	return parse(data,true)	
}

function combineOptionsListWithDefaults(options,defaults) { //WARNING: this function will NOT work for objects that have more than one level.
	var keys = Object.keys(defaults)
	var out = {}
	if (options) {
		for (var i = 0; i<keys.length; i++) {
			var key = keys[i]
			if (typeof options[key] != "undefined"){
				out[key] = options[key]
			} else {
				out[key] = defaults[key]
			}
		}
		return out
	} else {
		return defaults
	}
}

module.exports = initparse