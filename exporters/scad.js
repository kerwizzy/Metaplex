const fs = require("fs")
const path = require("path")
const colors = require("colors")


var headers = []

var operators = {
	"translate":{
		parse(o,l) {
			return "translate(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l)
		}	
	}
	,"rotate":{
		parse(o,l) {
			if (o.x == 0 && o.y == 0) {
				return "rotate("+o.z+") "+parse(o,l)
			} else {
				return "rotate(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l)
			}
		}		
	}
	,"scale":{
		parse(o,l) {
			return "scale(["+o.x+","+o.y+","+o.z+"]) "+parse(o,l)
		}		
	}
	,"linear_extrude":{
		parse(o,l) {
			return "linear_extrude(height="+o.height+",convexity=10,twist="+o.twist+",scale="+o.scale+") {\n"+parse(o,l)+"\n}"
		}
	}
	,"rotate_extrude":{
		parse(o,l) {
			return "rotate_extrude(angle="+o.angle+",convexity=2) {\n"+parse(o,l)+"\n}"
		}
	}
	,"cube":{
		parse(o,l) {
			return "cube("+o.size+")"
		}		
	}
	,"cylinder":{
		parse(o,l) {
			if (typeof o.radius == "undefined") {
				err("Radius is undefined. "+l.errtext)
			}
			return "cylinder(h="+o.height+",r="+o.radius+")"
		}
	}
	,"sphere":{
		parse(o,l) {
			return "sphere("+o.radius+")"
		}
	}
	,"box":{
		parse(o,l) {
			return "cube(["+o.width+","+o.depth+","+o.height+"])"
		}
	}
	,"cone":{
		parse(o,l) {
			return "cylinder(h="+o.height+",r1="+o.radius1+",r2="+o.radius2+")"
		}
	}
	,"square":{
		parse(o,l) {
			return "square("+o.size+")"
		}
	}
	,"circle":{
		parse(o,l) {
			return "circle("+o.radius+")"
		}
	}
	,"polygon":{
		parse(o,l) {
			return "polygon("+JSON.stringify(o.points)+")"
		}
	}
	,"union":{
		parse(o,l) {
			return "union() {\n"+parse(o,l,"child1")+"\n"+parse(o,l,"child2")+"\n}"
		}
	}
	,"difference":{
		parse(o,l) {
			return "difference() {\n"+parse(o,l,"child1")+"\n"+parse(o,l,"child2")+"\n}"
		}
	}
	,"intersection":{
		parse(o,l) {
			return "intersection() {\n"+parse(o,l,"child1")+"\n"+parse(o,l,"child2")+"\n}"
		}
	}
	,"offset":{
		parse(o,l) {
			var out;
			if (o.mode == "radius") {
				out = "offset(r="+o.distance+")"
			} else if (o.mode == "delta") {
				out = "offset(delta="+o.distance+")"
			} else if (o.mode == "chamfer") {
				out = "offset(delta="+o.distance+",chamfer=true)"
			} else {
				err("Offset mode "+o.mode+" is not supported.")
			}
			return out+" "+parse(o,l)
		}
	}
	,"$fn":{
		parse(o,l) {
			return "{\n$fn="+o.fn+"\n"+parse(o,l)+"\n}"
		}
	}
	,"colorname":{
		parse(o,l) {
			return 'color("'+o.name+'",'+o.alpha+') '+parse(o,l)
		}
	}
	,"colorrgba":{
		parse(o,l) {
			return "color(["+o.r/255+","+o.g/255+","+o.b/255+","+o.a/255+"])"
		}
	}
	,"import":{
		parse(o,l) {
			return 'import("'+o.path+'",convexity='+10+')'
		}
	}
	,"empty":{
		parse(o,l) {
			return ""
		}
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

function parse(obj,loc,tag) {
	if (!loc) {
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
			return operators[type].parse(obj,loc)
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
	var out = parse(data)
	
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