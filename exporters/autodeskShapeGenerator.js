const fs = require("fs")
const path = require("path")
const colors = require("colors")

var headers = []

function primitive_circle(r,n) { //normals face DOWN
	var mesh = new Mesh3D();
	var lastX = r
	var lastY = 0;
	var thetaDelta = Math.PI*2/n
	for (var i = 1; i<=n; i++) {
		var theta = thetaDelta*i
		var x = r*Math.cos(theta)
		var y = r*Math.sin(theta)
		mesh.triangle(
		0,0,0,
		lastX,lastY,0,
		x,y,0)
		lastX = x
		lastY = y
	}
	return mesh;
}

function primitive_cylinder(r,n,h) {
	var mesh = new Mesh3D();
	var lastX = r
	var lastY = 0;
	
	var thetaDelta = Math.PI*2/n
	for (var i = 1; i<=n; i++) {
		var theta = thetaDelta*i
		var x = r*Math.cos(theta)
		var y = r*Math.sin(theta)
		
		//base
		mesh.triangle(
		0,0,0,
		lastX,lastY,0,
		x,y,0)
		
		//cap, notice swapped normals
		mesh.triangle(
		0,0,h,
		x,y,h,
		lastX,lastY,h)
		
		//side
		mesh.quad(lastX,lastY,0,lastX,lastY,h,x,y,h,x,y,0)
		
		lastX = x
		lastY = y
	}
	return mesh
}

function primitive_box(w,d,h) {
	var mesh = new Mesh3D();
	mesh.quad(
	0,0,0,
	0,d,0,
	w,d,0,
	w,0,0)
	
	mesh.quad(
	0,0,h,
	0,d,h,
	w,d,h,
	w,0,h)
	
	mesh.quad(
	0,0,0,
	0,d,0,
	0,d,h,
	0,0,h)
	
	mesh.quad(
	w,0,0,
	w,d,0,
	w,d,h,
	w,0,h)
	
	mesh.quad(
	0,0,0,
	0,0,h,
	w,0,h,
	w,0,0)
	
	mesh.quad(
	0,d,0,
	0,d,h,
	w,d,h,
	w,d,0)
	
	return mesh
}

function primitive_polygon(points) {
	var path = new Path2D();
	path.moveTo(points[0][0],points[0][1])
	for (var i = 1; i<points.length; i++) {
		path.lineTo(points[i][0],points[i][1])
	}
	path.close();
	return path
}

var nCallbackLevel = 0; //Number of callbacks to close

var operators = {
	"translate":{
		parse(o,l,d) {
			return parse(o,l,d)+".transform(new Matrix3D().translation("+o.x+","+o.y+","+o.z+"))"
		}	
	}
	,"rotate":{
		parse(o,l,d) {
			if (o.x == 0 && o.y == 0) {
				return parse(o,l,d)+".transform(new Matrix3D().rotationZ("+o.z+"))"
			} else {
				return parse(o,l,d)+".transform(new Matrix3D().rotationZ("+o.x+","+o.y+","+o.z+"))"
			}
		}		
	}
	,"scale":{
		parse(o,l,d) {
			return parse(o,l,d)+".transform(new Matrix3D().scaling("+o.x+","+o.y+","+o.z+"))"
		}		
	}
	,"mirror":{
		parse(o,l,d) {
			return parse(o,l,d)+".transform(new Matrix3D().scaling("+(-o.x)+","+(-o.y)+","+(-o.z)+")).flipNormals()" //TODO: this won't work correctly in all cases (the values are supposed to define a plane to mirror on), but this will work for now.
		}		
	}
	/*
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
	*/
	,"cylinder":{
		parse(o,l,d) {
			return "primitive_cylinder("+o.radius+genFnParam(d)+","+o.height+")"
		}
	}
	/*
	,"sphere":{
		parse(o,l,d) {
			return "sphere("+o.radius+genFnParam(d)+")"
		}
	}
	*/
	,"box":{
		parse(o,l,d) {
			return "primitive_box("+o.width+","+o.depth+","+o.height+")"
		}
	}
	/*
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
	*/
	,"polygon":{
		parse(o,l,d) {
			return "primitive_polygon("+o.points+")"
		}
	}
	/*
	,"text":{
		parse(o,l,d) {
			return `text("${o.text}",${o.size},"${o.font}",halign="${o.halign}",valign="${o.valign}",spacing=${o.spacing},direction="${o.direction}",language="${o.language}",script="${o.script}")`
		}	
	}*/
	
	/*
	
	translate {
		
	child:{
		type:union
		child1:{
				type:rotate
				angle:...
				child:{
					type:difference
					child1:...
					child2:...
				}
			}
		}
		child2:{
			....
		}
	}
	}
	
	<child1>.subtract(<child2>,function(mesh) {
		mesh.rotate().unify(<child2>,function(mesh) {
			callback(mesh)
	
	
	Added at end using nCallbackLevel
		})
	})
	
	
	
	*/
	
	,"union":{
		parse(o,l,d) {
			nCallbackLevel++
			return parse(o,l,"child1",d)+".unify("+parse(o,l,"child2",d)+",function(mesh) {\nmesh"
		}
	}
	,"difference":{
		parse(o,l,d) {
			nCallbackLevel++
			return parse(o,l,"child1",d)+".subtract("+parse(o,l,"child2",d)+",function(mesh) {\nmesh"
		}
	}
	,"intersection":{
		parse(o,l,d) {
			nCallbackLevel++
			return parse(o,l,"child1",d)+".intersect("+parse(o,l,"child2",d)+",function(mesh) {\nmesh"
		}
	}
	/*
	,"offset":{
		parse(o,l,d) {
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
			return out+" "+parse(o,l,d)
		}
	}
	*/
	,"$fn":{
		parse(o,l,d) {
			var dataCopy = copy(d)
			dataCopy.fn = o.fn
			return parse(o,l,dataCopy)
		}
	}
	/*
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
	*/
	,"empty":{
		parse(o,l,d) {
			return "new Mesh3D()"
		}
	}
}

function copy(obj) {
	return JSON.parse(JSON.stringify(obj))
}

function genFnParam(d) {
	if (d.fn != defaultData.fn) {
		return ","+d.fn
	} else {
		return ",30"
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
	console.error(colors.red(colors.inverse("AUTODESK EXPORT")+"\t"+str))
}

function warn(str) {
	console.log(colors.orange(colors.inverse("AUTODESK EXPORT")+"\t"+str))
}

function debuginfo(str) {
	if (debug) {
		console.log(colors.green(colors.inverse("AUTODESK EXPORT")+"\t"+str))
	}
}

const DEFAULT_OPTIONS = {
	debug:false	
}

function initparse(data,options) {
	nCallbackLevel = 0;
	
	options = combineOptionsListWithDefaults(options,DEFAULT_OPTIONS)
	debug = options.debug
	var out = parse(data,undefined,defaultData)
	if (nCallbackLevel == 0) {
		out = "var mesh = "+out
	}
	out += "\ncallback(Solid.make(mesh))"
	
	for (var i = 0; i<nCallbackLevel; i++) {
		out += "\n})"
	}
	
out = `// Convenience Declarations For Dependencies.
// 'Core' Is Configured In Libraries Section.
// Some of these may not be used by this file.
var Conversions = Core.Conversions;
var Debug = Core.Debug;
var Path2D = Core.Path2D;
var Point2D = Core.Point2D;
var Point3D = Core.Point3D;
var Matrix2D = Core.Matrix2D;
var Matrix3D = Core.Matrix3D;
var Mesh3D = Core.Mesh3D;
var Plugin = Core.Plugin;
var Tess = Core.Tess;
var Sketch2D = Core.Sketch2D;
var Solid = Core.Solid;
var Vector2D = Core.Vector2D;
var Vector3D = Core.Vector3D;


${primitive_cylinder.toString()}
${primitive_polygon.toString()}
${primitive_box.toString()}

function shapeGeneratorDefaults(callback) {
var params = [{}];
callback(params);
}

function shapeGeneratorEvaluate(params, callback) {
${out}
}
	`
	
	
	//Add semicolons.
	out = out.split("\n");
	for (var i = 0; i<out.length; i++) {
		var lastChar = out[i].substr(-1)
		if (!lastChar.match(/[{}\s;<>(,]/g) && out[i].length != 0) {
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