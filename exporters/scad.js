const fs = require("fs")
const path = require("path")
const colors = require("colors")


var headers = []

var operators = {
	"translate":{
		parse(o,l,d) {
			return "translate(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l,d)
		}	
	}
	,"rotate":{
		parse(o,l,d) {
			if (o.x == 0 && o.y == 0) {
				return "rotate("+o.z+") "+parse(o,l,d)
			} else {
				return "rotate(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l,d)
			}
		}		
	}
	,"scale":{
		parse(o,l,d) {
			return "scale(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l,d)
		}		
	}
	,"mirror":{
		parse(o,l,d) {
			return "mirror(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l,d)
		}		
	}
	,"multmatrix":{
		parse(o,l,d) {
			var m = o.matrix.join(",").split(",")
			/*
			INPUT
			0  1  2  3
			4  5  6  7
			8  9  10 11
			12 13 14 15
			
			SCAD FORMAT
			0 4 8  12
			1 5 9  13
			2 6 10 14
			3 7 11 15
			*/
			
			var line1 = [m[0],m[4],m[8],m[12]].join(",")
			var line2 = [m[1],m[5],m[9],m[13]].join(",")
			var line3 = [m[2],m[6],m[10],m[14]].join(",")
			var line4 = [m[3],m[7],m[11],m[15]].join(",")
			var out = "[["+([line1,line2,line3,line4].join("],["))+"]]"
			
			return "multmatrix("+out+") "+parse(o,l,d)
		}		
	}
	,"linear_extrude":{
		parse(o,l,d) {
			return "linear_extrude(height="+o.height+",convexity=10,twist="+o.twist+",scale="+o.scale+") {\n"+parse(o,l,d)+"\n}"
		}
	}
	,"rotate_extrude":{
		parse(o,l,d) {
			return "rotate_extrude(angle="+o.angle+genFnParam(d)+",convexity=2) {\n"+parse(o,l,d)+"\n}"
		}
	}
	,"project":{
		parse(o,l,d) {
			return "projection(cut="+o.cut+") "+parse(o,l,d)
		}
	}
	,"cube":{
		parse(o,l,d) {
			return "cube("+o.size+")"
		}		
	}
	,"cylinder":{
		parse(o,l,d) {
			if (typeof o.radius == "undefined") {
				err("Radius is undefined. "+l.errtext)
			}
			return "cylinder(h="+o.height+",r="+o.radius+genFnParam(d)+")"
		}
	}
	,"sphere":{
		parse(o,l,d) {
			return "sphere("+o.radius+genFnParam(d)+")"
		}
	}
	,"box":{
		parse(o,l,d) {
			return "cube(["+o.width+","+o.depth+","+o.height+"])"
		}
	}
	,"cone":{
		parse(o,l,d) {
			return "cylinder(h="+o.height+",r1="+o.radius1+",r2="+o.radius2+genFnParam(d)+")"
		}
	}
	,"rectangle":{
		parse(o,l,d) {
			return "square(["+o.x+","+o.y+"])"
		}
	}
	,"circle":{
		parse(o,l,d) {
			return "circle("+o.radius+genFnParam(d)+")"
		}
	}
	,"polygon":{
		parse(o,l,d) {
			return "polygon("+JSON.stringify(o.points)+")"
		}
	}
	,"text":{
		parse(o,l,d) {
			return `text("${o.text}",${o.size},"${o.font}",halign="${o.halign}",valign="${o.valign}",spacing=${o.spacing},direction="${o.direction}",language="${o.language}",script="${o.script}")`
		}	
	}
	,"union":{
		parse(o,l,d) {
			return generateMultichildOperation("union",o,l,d)
		}
	}
	,"difference":{
		parse(o,l,d) {
			return generateMultichildOperation("difference",o,l,d)
		}
	}
	,"intersection":{
		parse(o,l,d) {
			return generateMultichildOperation("intersection",o,l,d)
		}
	}
	,"offset":{
		parse(o,l,d) {
			var out;
			if (o.mode == "radius") {
				out = "offset(r="+o.distance+genFnParam(d)+")"
			} else if (o.mode == "delta") {
				out = "offset(delta="+o.distance+")"
			} else if (o.mode == "chamfer") {
				out = "offset(delta="+o.distance+",chamfer=true)"
			} else {
				err("Offset mode "+o.mode+" is not supported.")
			}
			return out+" "+parse(o,l,d)
		}
	}
	,"minkowskiAdd":{
		parse(o,l,d) {
			return "minkowski() {\n"+parse(o,l,"child1",d)+"\n"+parse(o,l,"child2",d)+"\n}"
		}
	}
	,"$fn":{
		parse(o,l,d) {
			var dataCopy = copy(d)
			dataCopy.fn = o.fn
			return "//$fn="+o.fn+"\n"+parse(o,l,dataCopy)
		}
	}
	,"colorname":{
		parse(o,l,d) {
			return 'color("'+o.name+'",'+o.alpha+') '+parse(o,l,d)
		}
	}
	,"colorrgba":{
		parse(o,l,d) {
			return "color(["+o.r/255+","+o.g/255+","+o.b/255+","+o.a/255+"])"
		}
	}
	,"import":{
		parse(o,l,d) {
			return 'import("'+o.path+'",convexity='+10+')'
		}
	}
	,"empty":{
		parse(o,l,d) {
			d.isEmpty = true //This passes the fact that this chain is empty up to higher calls in the tree, allowing this chain to be optimized away
			return ""
		}
	}
}

function generateMultichildOperation(name,o,l,d) {
	var dcopy1 = copy(d)
	var dcopy2 = copy(d)
	
	var child1 = parse(o,l,"child1",dcopy1)
	var child2 = parse(o,l,"child2",dcopy2)
	
	if (!debug) {
		if (!dcopy1.isEmpty && !dcopy2.isEmpty) {
			return name+"() {\n"+child1+"\n"+child2+"\n}"
		} else if (!dcopy1.isEmpty) {
			return child1
		} else if (!dcopy2.isEmpty) {
			return child2
		} else { 
			d.isEmpty = true
			return ""
		}
	} else {
		if (dcopy1.isEmpty && dcopy2.isEmpty) {
			d.isEmpty = true
			return ""
		} else {		
			if (dcopy1.isEmpty) {
				child1 = commentOut("//empty: \n"+child1)
			}
			if (dcopy2.isEmpty) {
				child2 = commentOut("//empty: \n"+child2)
			}
			return name+"() {\n"+child1+"\n"+child2+"\n}"
		}
	}
}

function commentOut(txt) {
	var lines = txt.split("\n")
	for (var i = 0; i<lines.length; i++) {
		if (lines[i].substr(0,2) != "//") {
			lines[i] = "//"+lines[i]
		}
	}
	return lines.join("\n")
}

function copy(obj) {
	return JSON.parse(JSON.stringify(obj))
}

function genFnParam(d) {
	if (d.fn != defaultData.fn) {
		return ",$fn="+d.fn
	} else {
		return ""
	}
}

class Location {
	constructor(level,stack) {
		if (!level) {
			level = 0;
		}
		if (!stack) {
			stack = []
		}
		this.level = level;
		this.stack = stack
	}
	
	push(tag) {
		var stack = this.stack.slice(0)
		stack.push(tag)
		return new Location(this.level+1,stack)
	}
	
	get errtext() {
		return this.stack.join(",")
	}
}

var defaultData = {
	fn:0
}

function parse(obj,loc,tag,data) {
	//{... child:{}},Location {},{fn:90} -> {... child:{}},Location {},undefined,{fn:90}
	if (typeof data == "undefined") {
		data = tag
		tag = undefined
	}
	
	if (!loc) { //usually only true if root
		loc = new Location()
	} else {
		if (!tag) {
			tag = "child"
		}
		loc = loc.push(obj.type)
		obj = obj[tag]
	}
	var type = obj.type
	if (operators[type]) {
		try {
			return operators[type].parse(obj,loc,data)
		} catch(error) {
			err(error+", loc = "+loc.errtext)
		}
	} else {
		err('Internal Error: Operator or primitive "'+type+'" is currently not supported. loc ='+loc.errtext)
	}
}

function addDependency(name) {
	var dependency = "use <"+path.resolve(path.dirname(process.argv[1]),"./openscad_modules/"+name)+">"
	if (headers.indexOf(dependency) == -1) {
		headers.push(dependency)
	}	
}

function err(str) {
	console.error(colors.red(colors.inverse("SCAD EXPORT")+"\t"+str))
}

function warn(str) {
	console.log(colors.orange(colors.inverse("SCAD EXPORT")+"\t"+str))
}

function debuginfo(str) {
	if (debug) {
		console.log(colors.green(colors.inverse("SCAD EXPORT")+"\t"+str))
	}
}

const DEFAULT_OPTIONS = {
	debug:false	
}

function initparse(data,options) {
	options = combineOptionsListWithDefaults(options,DEFAULT_OPTIONS)
	debug = options.debug
	var out = parse(data,undefined,defaultData)
	
	//Add semicolons.
	out = out.split("\n");
	for (var i = 0; i<out.length; i++) {
		var lastChar = out[i].substr(-1)
		if (!lastChar.match(/[{}\s;<>]/g) && out[i].length != 0) {
			out[i] += ";"
		}
	}
	return out.join("\n")
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