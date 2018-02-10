const fs = require("fs")
const Path = require("path")
const colors = require("colors")
const FilteredError = require("./filterederror.js")


var Metaplex = {
	
	
}
/**
# Metaplex.solid

Generic class to Represents all objects which can be transformed, translated, etc.

@property {Metaplex.operation[]} operations - an array of the base operations applied to this object, before it is processed as a child of another object
@property {Metaplex.operation[]} parentOperations - TODO
*/
Metaplex.solid = class {
	constructor() {
		this.operations = []
		this.parentOperations = [] //Operations applied to the parent of this object. Used to properly preform transforms of bounding boxes of objects inside other objects
		this.isChild = false //True only if this object is a non-main child of a multiple-children operation, such as union or intersection, but not translation, scale, etc. 
		this.points = {}
		this.pointData = {}
		this.addPoint("origin",[0,0,0])
	}
	/**
	Apply an operation to this object and all child objects
	
	@param {Metaplex.operation} operation
	*/
	applyOperation(operation) {
		if (operation.isLocationTransform) { 
			for (var i = 0; i<this.operations.length; i++) {
				var op = this.operations[i]
				if (op.isMultichild) {
					op.applyToChildren(operation)
				}
			}
		}
		this.operations.push(operation)
	}
	
	/**
	Inform this object of an operation applied to a one of its parent object. This operation is passed as a parent operation to all child objects.
	
	@param {Metaplex.operation} operation - the operation which was applied to the parent object	
	*/
	
	applyParentOperation(operation) {
		for (var i = 0; i<this.operations.length; i++) {
			var op = this.operations[i]
			if (op.isMultichild) {
				op.applyToChildren(operation)
			}
		}
		this.parentOperations.push(operation)
	}

	/**
		Allows getting and setting the most recent operation.
	*/
	get lastOperation() {
		return this.operations[this.operations.length-1]
	}
	
	set lastOperation(v) {
		this.operations[this.operations.length-1] = v
	}
	
	/**
		The final (after all transformations) dimension of this object. Either 2 or 3
		
		@returns {number}
	*/
	get dimension() {
		var dim = this.rootdimension
		for (var i = 0; i<this.operations.length; i++) {
			dim = this.operations[i].transformDimension(dim)
		}
		return dim
	}
	
	/**
	Returns the bounding box of this object before it was a child of another object.
	
	Output format: [[minx,miny,minz],[maxx,maxy,maxz]]
	
	@returns {number[][]}
	*/
	get ownBoundingBox() { 
		var bounds = this.rootboundingbox
		if (typeof bounds == "undefined") {
			Metaplex.log.error("Primitive bounds not defined.",false)
			return;
		}
		for (var i = 0; i<this.operations.length; i++) {
			bounds = this.operations[i].transformBoundingBox(bounds)
			if (typeof bounds == "undefined") {
				Metaplex.log.error("Bounding box transform of operation not defined.",false)
				return;
			}
		}
		
		return bounds
	}
	
	/**
	Returns the current bounding box, including the transformations applied to the parent
	
	Output format: [[minx,miny,minz],[maxx,maxy,maxz]]
	
	@returns {number[][]}
	*/	
	get boundingBox() {
		var bounds = this.ownBoundingBox
		for (var i = 0; i<this.parentOperations.length; i++) {
			bounds = this.parentOperations[i].transformBoundingBox(bounds)
			if (typeof bounds == "undefined") {
				Metaplex.log.error("Bounding box transform of operation not defined.",false)
				return;
			}
		}
		return bounds
	}
	
	/**
	takes a point and transforms it according to this objects transformations (rotation, scale, etc)
	
	@param {Metaplex.vec3|number[]} point - the input point
	@param {number} operationsOffset
	@param {number} parentOperationsOffset
	@returns {Metaplex.vec3}
	*/
	transformPoint(point,operationsOffset,parentOperationsOffset) {
		point = new Metaplex.vec3(point).arr()
		for (var i = operationsOffset; i<this.operations.length; i++) {
			point = this.operations[i].transformPoint(point)
			if (typeof point == "undefined") {
				Metaplex.log.error("Point transform of operation not defined.",false)
				return;
			}
		}
		for (var i = parentOperationsOffset; i<this.parentOperations.length; i++) {
			point = this.parentOperations[i].transformPoint(point)
			if (typeof point == "undefined") {
				Metaplex.log.error("Point transform of operation not defined.",false)
				return;
			}
		}
		
		return new Metaplex.vec3(point)
	}
	
	addPoint(name,val) {
		var parentObject = this
		this.pointData[name] = {}
		Object.defineProperty(this.points,name,{
			set:function(v) {
				parentObject.pointData[name].loc = new Metaplex.vec3(v)
				parentObject.pointData[name].operationOffset = parentObject.operations.length
				parentObject.pointData[name].parentOperationOffset = parentObject.parentOperations.length
			}
			,get:function() {
				return parentObject.transformPoint(parentObject.pointData[name].loc,parentObject.pointData[name].operationOffset,parentObject.pointData[name].parentOperationOffset)
			}
			,configurable:true
			,enumerable:true
		})
		if (val) {
			this.points[name] = new Metaplex.vec3(val)
		}
		return this
	}
	
	removePoint(name) {
		delete this.points[name]
		delete this.pointData[name]
		return this
	}

	setOrigin(a,b,c) {
		var point = new Metaplex.vec3(a,b,c).arr();
		this.points.origin = point
		return this
	}
	
	get origin() {
		return this.points.origin
	}
	
	set origin(v) {
		this.points.origin = v
	}
	
	get originX() {
		return this.points.origin[0]
	}
	
	get originY() {
		return this.points.origin[1]
	}
	
	get originZ() {
		return this.points.origin[2]
	}
	
	get minX() {
		return this.boundingBox[0][0]			
	}
	
	get minY() {
		return this.boundingBox[0][1]			
	}
	
	get minZ() {
		return this.boundingBox[0][2]			
	}
	
	get min() {
		return new Metaplex.vec3(this.boundingBox[0])
	}
	
	get maxX() {
		return this.boundingBox[1][0]			
	}
	
	get maxY() {
		return this.boundingBox[1][1]			
	}
	
	get maxZ() {
		return this.boundingBox[1][2]			
	}
	
	get max() {
		return new Metaplex.vec3(this.boundingBox[1])
	}
	
	get centerX() {
		return (this.minX+this.maxX)/2
	}
	
	get centerY() {
		return (this.minY+this.maxY)/2
	}
	
	get centerZ() {
		return (this.minZ+this.maxZ)/2
	}
	
	get center() {
		return this.min.add(this.max).scale(0.5)
	}
	
	get range() {
		return this.max.subtract(this.min)
	}
	
	//Align Min
	alignMinX(val) {
		if (val instanceof Metaplex.solid) val = val.minX
		if (typeof val != "number") val = new Metaplex.vec3(val).x
		
		this.translate(val-this.minX,0,0)
		return this
	}
	
	alignMinY(val) {
		if (val instanceof Metaplex.solid) val = val.minY
		if (typeof val != "number") val = new Metaplex.vec3(val).y
		
		this.translate(0,val-this.minY,0)
		return this
	}
	
	alignMinZ(val) {
		if (val instanceof Metaplex.solid) val = val.minZ
		if (typeof val != "number") val = new Metaplex.vec3(val).z
		
		this.translate(0,0,val-this.minZ)
		return this
	}
	
	//Align Center
	alignCenterX(val) {
		if (val instanceof Metaplex.solid) val = val.centerX
		if (typeof val != "number") val = new Metaplex.vec3(val).x
		
		this.translate(val-this.centerX,0,0)
		return this
	}
	
	alignCenterY(val) {
		if (val instanceof Metaplex.solid) val = val.centerY
		if (typeof val != "number") val = new Metaplex.vec3(val).y
		
		this.translate(0,val-this.centerY,0)
		return this
	}
	
	alignCenterZ(val) {
		if (val instanceof Metaplex.solid) val = val.centerZ
		if (typeof val != "number") val = new Metaplex.vec3(val).z
		
		this.translate(0,0,val-this.centerZ)
		return this
	}
	
	//Align Max
	alignMaxX(val) {
		if (val instanceof Metaplex.solid) val = val.maxX
		if (typeof val != "number") val = new Metaplex.vec3(val).x
		
		this.translate(val-this.maxX,0,0)
		return this
	}
	
	alignMaxY(val) {
		if (val instanceof Metaplex.solid) val = val.maxY
		if (typeof val != "number") val = new Metaplex.vec3(val).y
		
		this.translate(0,val-this.maxY,0)
		return this
	}
	
	alignMaxZ(val) {
		if (val instanceof Metaplex.solid) val = val.maxZ
		if (typeof val != "number") val = new Metaplex.vec3(val).z
		
		this.translate(0,0,val-this.maxZ)
		return this
	}
	
	alignCenterXY(ob) {
		this.alignCenterX(ob)
		this.alignCenterY(ob)
		return this
	}
	
	alignCenterXYZ(ob) {
		this.alignCenterX(ob)
		this.alignCenterY(ob)
		this.alignCenterZ(ob)
		return this
	}
	
	alignPoints(p1,p2) {
		var delta = p2.subtract(p1)
		this.translate(delta)
	}
	
	copyTopOperation(ob) {
		this.applyOperation(ob.lastOperation)
		return this
	}
	
	move(dx,dy,dz) {
		return this.translate(dx,dy,dz)
	}
	
	translate(a,b,c) {
		var vec = new Metaplex.vec3(a,b,c)
		this.applyOperation(new Metaplex.operations.translate(vec))
		return this
	}
	
	rotx(rx) {
		return this.rotate(rx,0,0)
	}
	
	roty(ry) {
		return this.rotate(0,ry,0)
	}
	
	rotz(rz) {
		return this.rotate(0,0,rz)
	}		
	
	rotate(rx,ry,rz,origin) {
		if (origin) {
			this.alignPoints(origin.clone(),Metaplex.origin)
		}
		this.applyOperation(new Metaplex.operations.rotate(rx,ry,rz))
		if (origin) {
			this.alignPoints(Metaplex.origin,origin)
		}		
		return this
	}
	
	scale(sx,sy,sz) {
		if (typeof sy == "undefined") {
			sy = sx
			sz = sx
		}
		
		this.applyOperation(new Metaplex.operations.scale(sx,sy,sz))
		return this
	}
	
	mirror(x,y,z) {
		this.applyOperation(new Metaplex.operations.mirror(x,y,z))
		return this
	}
	
	mirrorX() {
		return this.mirror(1,0,0)
	}
	
	mirrorY() {
		return this.mirror(0,1,0)
	}
	
	mirrorZ() {
		return this.mirror(0,0,1)
	}
	
	multmatrix(matrix) {
		this.applyOperation(new Metaplex.operations.multmatrix(matrix))
		return this
	}
	
	copy() {
		var pointLocations = {}
		var keys = Object.keys(this.points)
		for (var key of keys) {
			pointLocations[key] = this.points[key]
		}
		
		return new Metaplex.copy(this.json(),this.dimension,this.boundingBox,pointLocations)
	}
	
	offset(amount,mode) {
		this.applyOperation(new Metaplex.operations.offset(amount,mode))
		return this
	}
	
	minkowskiAdd(ob) {
		this.applyOperation(new Metaplex.operations.minkowskiAdd(ob))
		return this
	}
	
	minkowskiSub(ob) {
		this.applyOperation(new Metaplex.operations.minkowskiSub(ob,this.boundingBox))
		return this
	}
	
	
	linear_extrude(height,twist,scale) {
		if (this.dimension != 3) {
			if (!scale) {
				scale = 1
			}
			if (!twist) {
				twist = 0
			}
			this.applyOperation(new Metaplex.operations.linear_extrude(height,twist,scale))
			return this
		} else {
			Metaplex.log.error('Cannot use "linear_extrude" on a 3D object.')
		}
	}
	
	rotate_extrude(degrees) {
		if (this.dimension != 3) {
			this.applyOperation(new Metaplex.operations.rotate_extrude(degrees))
			return this
		} else {
			Metaplex.log.error('Cannot use "rotate_extrude" on a 3D object.')
		}
	}
	
	project(plane,cut) {
		if (this.dimension == 3) {
			this.applyOperation(new Metaplex.operations.project(plane,cut))
			return this
		} else {
			Metaplex.log.error('Cannot use "project" on a 2D object.')
		}
	}
	
	display_debug() {
		this.applyOperation(new Metaplex.operations.display_debug())
		return this
	}
	
	color(r,g,b,a) {
		if (typeof r == "string") {
			var name = r
			var alpha = g
			if (typeof alpha == "undefined") {
				alpha = 1
			}
			this.applyOperation(new Metaplex.operations.colorname(name,alpha))
		} else {
			this.applyOperation(new Metaplex.operations.color(r,g,b,a))
		}
		return this
	}
	
	setFN(fn) {
		this.applyOperation(new Metaplex.operations.setFN(fn))
		this.fn = fn
		return this
	}
	
	add() {
		for (var i = 0; i<arguments.length; i++) {
			this.applyOperation(new Metaplex.operations.union(arguments[i]))
		}
		return this
	}
	
	sub(ob) {
		for (var i = 0; i<arguments.length; i++) {
			this.applyOperation(new Metaplex.operations.difference(arguments[i]))
		}
		return this
	}
	
	and(ob) {
		for (var i = 0; i<arguments.length; i++) {
			this.applyOperation(new Metaplex.operations.intersection(arguments[i]))
		}
		return this
	}
	
	json() {
		var out = this.rootjson()
		for (var i = 0; i<this.operations.length; i++) {
			var op = this.operations[i]
			out = op.json(out)
		}
		return out
	}
	
	save(path,a,b) { 
		//examples:		
		// "blah.scad",{debug:true}
		// "blah.js","Autodesk Shape Generator",{debug:true}
		var options
		var exporter
		if (typeof a == "string") {
			options = b
			exporter = a
		} else {
			options = a
		}
		
		Metaplex.save(this.json(),path,options,exporter)
	}
	
	exportAs(exporter,options) {
		return Metaplex.exportAs(this.json(),exporter,options)
	}
}

Metaplex.utils = {
	removeExtension(path) {
		path = path.split(".")
		path.pop();
		return path.join(".")
	}
	,getExtension(path) {
		path = path.split(".")
		return path.pop();
	}
	,radiansToDegrees(r) {
		return r/(2*Math.PI)*360
	}
	,degreesToRadians(d) {
		return d/360*2*Math.PI
	}
	,slopeStretch(m) { //returns the factor by which the intersection of a wall rotated at slope <m> is larger than the thickness of the wall
		return 1/(Math.sin(Math.atan(m)))
	}
	,slopeIntersectHorizontal(m,thickness) { //returns the length of the intersection between a wall of <thickness> at slope <m> with a horizontal line
		var theta = Math.atan(m)
		return Math.abs(thickness/Math.sin(theta))
	}
	,slopeIntersectVertical(m,thickness) { //returns the length of the intersection between a wall of <thickness> at slope <m> with a vertical line
		var theta = Math.atan(m)
		return Math.abs(thickness/Math.cos(theta))
	}
	,checkValues(obj) {
		var keys = Object.keys(obj)
		for (var i = 0; i<keys.length; i++) {
			if (typeof obj[keys[i]] == "undefined") {
				Metaplex.log.error(keys[i]+" is undefined.")
			}
		}
	}
	,copyBoundingBox(b) {
		var minX = b[0][0]
		var minY = b[0][1]
		var minZ = b[0][2]
		var maxX = b[1][0]
		var maxY = b[1][1]
		var maxZ = b[1][2]
		
		return [[minX,minY,minZ],[maxX,maxY,maxZ]]
	}
	,copyObject(ob) {
		return JSON.parse(JSON.stringify(ob))
	}
}


/*
At the moment, Metaplex.group and Metaplex.empty are
equivalent, but more features a planned to be added
to Metaplex.group in the future. Originally
Metaplex.group was a polyfill for older versions of
Metaplex and also some constructions involving
loops, etc that are awkward to define other ways.
*/
Metaplex.group = class extends Metaplex.solid {
	constructor() {
		super()
		this.rootboundingbox = [[0,0,0],[0,0,0]]
	}
	
	rootjson() {
		return {
			type:"empty"
		}
	}
}

Metaplex.empty = class extends Metaplex.solid {
	constructor() {
		super()
		this.rootboundingbox = [[0,0,0],[0,0,0]]
	}
	
	rootjson() {
		return {
			type:"empty"
		}
	}	
}

Metaplex.copy = class extends Metaplex.solid {
	constructor(json,dimension,bounds,pointLocations) { //note that point locations is NOT equivalent to Solid.pointData. It is a list of name:loc pairs of the transformed locations of points at the time of the copy.
		super()
		this.removePoint("origin") //origin will be set below where the points are copied. This ensures that a transformed origin is copied correctly.
		
		this.rootdimension = dimension
		this.rootboundingbox = bounds
		this.parent = json
		for (var key in pointLocations) {
			this.addPoint(key,pointLocations[key]) //Don't have to do anything with the operation offsets because this is a new object and doesn't have any operations.
		}
	}
	
	rootjson() {
		return this.parent
	}
}




//TODO: work on rotation bounding box size increase build up
/**
Generic operations class.

@constructor
*/
Metaplex.operation = class {
	constructor() {
		this.isLocationTransform = true
	}
	
	transformBoundingBox(box) {
		var matrix = this.matrix
		if (matrix) {
			var minX = box[0][0]
			var minY = box[0][1]
			var minZ = box[0][2]
			var maxX = box[1][0]
			var maxY = box[1][1]
			var maxZ = box[1][2]
			
			var a = matrix.transform(new Metaplex.vec3(maxX,maxY,minZ)) //counter-clockwise on lower
			var b = matrix.transform(new Metaplex.vec3(minX,maxY,minZ))
			var c = matrix.transform(new Metaplex.vec3(minX,minY,minZ))
			var d = matrix.transform(new Metaplex.vec3(maxX,minY,minZ))
			
			var e = matrix.transform(new Metaplex.vec3(maxX,maxY,maxZ)) //counter-clockwise on upper
			var f = matrix.transform(new Metaplex.vec3(minX,maxY,maxZ))
			var g = matrix.transform(new Metaplex.vec3(minX,minY,maxZ))
			var h = matrix.transform(new Metaplex.vec3(maxX,minY,maxZ))		
			
			minX = Math.min(a.x,b.x,c.x,d.x,e.x,f.x,g.x,h.x)
			maxX = Math.max(a.x,b.x,c.x,d.x,e.x,f.x,g.x,h.x)
			
			
			minY = Math.min(a.y,b.y,c.y,d.y,e.y,f.y,g.y,h.y)
			maxY = Math.max(a.y,b.y,c.y,d.y,e.y,f.y,g.y,h.y)
		
			minZ = Math.min(a.z,b.z,c.z,d.z,e.z,f.z,g.z,h.z)
			maxZ = Math.max(a.z,b.z,c.z,d.z,e.z,f.z,g.z,h.z)			
			
			return [[minX,minY,minZ],[maxX,maxY,maxZ]]
		}
	}
	
	transformPoint(point) {
		var matrix = this.matrix
		if (matrix) {
			return matrix.transform(point);		
		} else {
			return point.slice(0)
		}
	}
}


module.exports = Metaplex; //TODO: this was put here to try to allow other modules to access the utils object even when they themselves were loaded by Metaplex. Doing this worked even better than expected. Does it have any bad effects?
Metaplex.glmat4 = require("gl-mat4")

Metaplex.operations = require("./operations.js")
Metaplex.primitives = require("./primitives.js")

//https://stackoverflow.com/questions/17080055/organizing-and-documenting-multi-file-javascript-projects
/*
@name Metaplex.vec3
*/
Metaplex.vec3 = require("./vec3.js")
Metaplex.origin = new Metaplex.vec3(0,0,0)
Metaplex.plane = { //For use with Solid.project
	xy:new Metaplex.vec3(0,0,1)
	,yz:new Metaplex.vec3(1,0,0)
	,xz:new Metaplex.vec3(0,1,0)
}


Metaplex.mat4 = require("./mat4.js")


Metaplex.log = {
	error:function(s,hideMetaplex) {
		var err = new FilteredError(s)
		if (typeof hideMetaplex == "undefined") hideMetaplex = true
		if (hideMetaplex) err.filter(frame => frame.path != __filename)
		err.filter(frame => frame.type != "node")

		/*
		var arr = ["a"]
		arr.forEach(function(elem) {
			var error = new FilteredError(elem)
			console.log(error.stack)
			for (var i = 0; i<error.parsedStack.length; i++) {
				console.log(error.parsedStack[i].type)
			}
		})
		*/
		
		console.error(colors.red(colors.inverse("METAPLEX")+"\t"+err.stack))
	}
	,debug:function(s) {
		console.log(colors.green(colors.inverse("METAPLEX")+"\t"+s))
	}	
}

Metaplex.save = function(list,path,options,exporter) {
	var type = Metaplex.utils.getExtension(path)
	if (exporter) {
		type = exporter;
	}
	if (!Metaplex.exporters[type]) {
		Metaplex.log.error("Cannot find exporter module for file type '"+type+"'. Aborting save.")
	} else {
		fs.writeFileSync(path,Metaplex.exportAs(list,type,options),"utf8")
	}
}

Metaplex.exportAs = function(list,exporter,options) {
	if (!Metaplex.exporters[exporter]) {
		Metaplex.log.error("Cannot find exporter module '"+exporter+"'.")
	} else {
		return Metaplex.exporters[exporter].parse(list,options)
	}
}


Metaplex.exporters = {}


Metaplex.exporters.scad = {
	parse:require(__dirname+"/exporters/scad.js")
}

Metaplex.exporters["Autodesk Shape Generator"] = {
	parse:require(__dirname+"/exporters/autodeskShapeGenerator.js")
}

Metaplex.watch = {
	send:function(msg) {
		process.send(msg)		
	}	
}

Metaplex.addDependency = function(path) {
	Metaplex.watch.send({
		cmd:"addDependency"
		,path:path
	})
}

Metaplex.require = function(path) {
	Metaplex.addDependency(path)
	return require(Path.resolve(Path.parse(module.parent.filename).dir,path))
}

Metaplex.convert = require("convert-units")

Metaplex.makeConverter = function(unit) {
	return function(s,u) {
		/*
		POSSIBLE WAYS TO CALL
		units = "mm"
		s = "15in"
		u = undefined
		returns 15in converted to mm
		
		units = "mm"
		s = 15
		u = "in"
		returns 15in converted to mm
		
		
		*/
		
		if (!u) {
			for (var i = s.length-1; i >= 0; i--) {
				var substr = s.substr(0,i)
				var num = Number(substr)
				if (!isNaN(num)) {
					return Metaplex.convert(num).from(s.substr(i)).to(unit)
				}
			}
			Metaplex.log.error("Could not parse unit.")
		} else {
			return Metaplex.convert(s).from(u).to(unit)
		}		
	}	
}


module.exports = Metaplex