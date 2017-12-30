const fs = require("fs")
const path = require("path")
const colors = require("colors")
var Metaplex = require("../metaplex.js")


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
		x,y,0,
		lastX,lastY,0)
		
		
		//cap, notice swapped normals
		mesh.triangle(
		0,0,h,
		lastX,lastY,h,
		x,y,h)
		
		//side
		
		mesh.quad(
		x,y,0,
		x,y,h,
		lastX,lastY,h,
		lastX,lastY,0		
		)
		
		lastX = x
		lastY = y
	}
	return mesh
}

/*
mesh.quad(
0,0,0,
0,d,0,
w,d,0,
w,0,0);

mesh.quad(
w,0,h,
w,d,h,
0,d,h,
0,0,h	
);

mesh.quad(
0,0,0,
0,d,0,
0,d,h,
0,0,h);

mesh.quad(
w,0,h,
w,d,h,
w,d,0,
w,0,0	
);

mesh.quad(
0,0,0,
0,0,h,
w,0,h,
w,0,0);

mesh.quad(
w,d,0,
w,d,h,
0,d,h,
0,d,0	
);
*/

function primitive_box(w,d,h) {
	var mesh = new Mesh3D();
	
	mesh.quad(
	0,0,0,
	0,d,0,
	w,d,0,
	w,0,0);	
	
	mesh.quad(
	w,0,h,
	w,d,h,
	0,d,h,
	0,0,h	
	);	
	
	mesh.quad(
	0,0,h,
	0,d,h,
	0,d,0,
	0,0,0	
	);
	
	mesh.quad(
	w,0,0,
	w,d,0,
	w,d,h,
	w,0,h);

	mesh.quad(
	0,d,0,
	0,d,h,
	w,d,h,
	w,d,0);
	
	
	mesh.quad(
	w,0,0,
	w,0,h,
	0,0,h,
	0,0,0	
	);
	
	return mesh;
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
var tempMeshID = -1;
function tempMeshVariable() {
	tempMeshID++
	return "tempMesh_"+tempMeshID
}

var operators = {
	"translate":{
		parse(o,l,d,p) {
			var lower = parse(o,l,d)
			var text = lower.text+".transform(new Matrix3D().translation("+o.x+","+o.y+","+o.z+"))"
			return {text:text,data:lower.data}
		}	
	}
	,"rotate":{
		parse(o,l,d,p) {
			var lower = parse(o,l,d)
			if (o.x == 0 && o.y == 0) {
				var text = lower.text+".transform(new Matrix3D().rotationZ("+Metaplex.utils.degreesToRadians(o.z)+"))"
			} else if (o.x == 0 && o.z == 0) {
				var text = lower.text+".transform(new Matrix3D().rotationY("+Metaplex.utils.degreesToRadians(o.y)+"))"
			} else if (o.y == 0 && o.z == 0) {
				var text = lower.text+".transform(new Matrix3D().rotationX("+Metaplex.utils.degreesToRadians(o.x)+"))"
			} else {
				err("Rotation in multiple axes simultaneously is currenlty not supported.")
			}
			return {text:text,data:lower.data}
		}		
	}
	,"scale":{
		parse(o,l,d,p) {
			var lower = parse(o,l,d)
			var text = lower.text+".transform(new Matrix3D().scaling("+o.x+","+o.y+","+o.z+"))"
			return {text:text,data:lower.data}
		}		
	}
	,"mirror":{
		parse(o,l,d,p) {
			var lower = parse(o,l,d)
			var text = lower.text+".transform(new Matrix3D().scaling("+(-o.x)+","+(-o.y)+","+(-o.z)+")).flipNormals()" //TODO: this won't work correctly in all cases (the values are supposed to define a plane to mirror on), but this will work for now.
			return {text:text,data:lower.data}
		}		
	}
	/*
	,"linear_extrude":{
		parse(o,l,d,p) {
			return "linear_extrude(height="+o.height+",convexity=10,twist="+o.twist+",scale="+o.scale+") {\n"+parse(o,l,d)+"\n}"
		}
	}
	,"rotate_extrude":{
		parse(o,l,d,p) {
			return "rotate_extrude(angle="+o.angle+genFnParam(d)+",convexity=2) {\n"+parse(o,l,d)+"\n}"
		}
	}
	*/
	,"cylinder":{
		parse(o,l,d,p) {
			return "primitive_cylinder("+o.radius+genFnParam(d)+","+o.height+")"
		}
	}
	/*
	,"sphere":{
		parse(o,l,d,p) {
			return "sphere("+o.radius+genFnParam(d)+")"
		}
	}
	*/
	,"box":{
		parse(o,l,d,p) {
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
		parse(o,l,d,p) {
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
					child1:{
						type:intersection
						child1:a
						child2:b
					}
					child2:{
						type:union
						child1:c
						child2:d
					}
				}
			}
		}
		child2:{
			e
		}
	}
	}
	
	a.intersect(b,function(tempMesh3) {
		c.unify(d,function(tempMesh2) {
			tempMesh3.subtract(tempMesh2,function(tempMesh1) {
				tempMesh1.rotate().unify(d,function(tempMesh0) {
					callback(mesh)
	
	
	Added at end using nCallbackLevel
			})
		})
	})
	
	
	
	*/
	
	,"union":{
		parse(o,l,d,p) {
			return generateCallbackOperation(o,l,d,p,"unite")
		}
	}
	,"difference":{
		parse(o,l,d,p) {
			return generateCallbackOperation(o,l,d,p,"subtract")
		}
	}
	,"intersection":{
		parse(o,l,d,p) {
			return generateCallbackOperation(o,l,d,p,"intersect")
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
		parse(o,l,d,p) {
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
		parse(o,l,d,p) {
			return "new Mesh3D()"
		}
	}
}

function generateCallbackOperation(o,l,d,p,operation,child2Method) {
	nCallbackLevel++
	if (!child2Method) {
		child2Method = ""
	} else {
		child2Method = "."+child2Method
	}
	
	var child1 = parse(o,l,"child1",d)
	var child2 = parse(o,l,"child2",d)
	
	var expr1; //The expressions to actually use as an argument
	var expr2;
	var previous1; //Any previous callbacks
	var previous2;
	
	if (child1.data.callbackArgument) {
		expr1 = child1.data.callbackArgument
		previous1 = child1.text
		if (previous1.substr(-1) != "\n") {
			previous1+="\n"
		}
	} else {
		expr1 = child1.text
		previous1 = ""
	}
	
	if (child2.data.callbackArgument) {
		expr2 = child2.data.callbackArgument
		previous2 = child2.text
		if (previous2.substr(-1) != "\n") {
			previous2+="\n"
		}
	} else {
		expr2 = child2.text
		previous2 = ""
	}
	
	var callbackArgument = tempMeshVariable();
	
	var callbackFirstLine;
	var dontAddFirstLine = ["union","difference","intersection"]
	if (l.level <= 1 || dontAddFirstLine.indexOf(p.type) != -1) {
		callbackFirstLine = ""
	} else {
		callbackFirstLine = callbackArgument
	}
	
	var text = previous1+previous2+expr1+"."+operation+"("+expr2+child2Method+",function("+callbackArgument+") {\n"+callbackFirstLine
	return {text:text,data:{callbackArgument:callbackArgument},lastWasCallback:true}
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
	var objToCallWith;
	if (!loc) { //usually only true if root
		loc = new Location()
		objToCallWith = obj;
	} else {
		if (!tag) {
			tag = "child"
		}
		loc = loc.push(obj.type)
		objToCallWith = obj[tag]
	}
	var type = objToCallWith.type
	if (operators[type]) {
		try {
			var parsed = operators[type].parse(objToCallWith,loc,data,obj)
			if (typeof parsed == "string") {
				return {text:parsed,data:{}} //Must be in object format
			} else {
				return parsed
			}
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
	var parsed = parse(data,undefined,defaultData)
	var out = parsed.text
	if (nCallbackLevel == 0) {
		out = "callback(Solid.make("+out+"))"
	} else {
		if (!parsed.lastWasCallback) {
			out+="\n"
		}
		out += "callback(Solid.make("+parsed.data.callbackArgument+"))"
	}
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
callback([]);
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