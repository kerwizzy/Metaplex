const fs = require("fs")
const Path = require("path")
const colors = require("colors")
const FilteredError = require("./filterederror.js")


var Metaplex = {
	solid:class {
		constructor() {
			this.operations = []
		}

		get lastOperation() {
			return this.operations[this.operations.length-1]
		}
		
		set lastOperation(v) {
			this.operations[this.operations.length-1] = v
		}
		
		get dimension() {
			var dim = this.rootdimension
			for (var i = 0; i<this.operations.length; i++) {
				dim = this.operations[i].transformDimension(dim)
			}
			return dim
		}
		
		get boundingBox() { //returns something in the format [[minx,miny,minz],[maxx,maxy,maxz]]
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
		
		get minX() {
			return this.boundingBox[0][0]			
		}
		
		get minY() {
			return this.boundingBox[0][1]			
		}
		
		get minZ() {
			return this.boundingBox[0][2]			
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
		
		get centerX() {
			return (this.minX+this.maxX)/2
		}
		
		get centerY() {
			return (this.minY+this.maxY)/2
		}
		
		get centerZ() {
			return (this.minZ+this.maxZ)/2
		}
		
		//Align Min
		alignMinX(val) {
			if (val instanceof Metaplex.solid) val = val.minX
			
			this.translate(val-this.minX,0,0)
			return this
		}
		
		alignMinY(val) {
			if (val instanceof Metaplex.solid) val = val.minY
			
			this.translate(0,val-this.minY,0)
			return this
		}
		
		alignMinZ(val) {
			if (val instanceof Metaplex.solid) val = val.minZ
			
			this.translate(0,0,val-this.minZ)
			return this
		}
		
		//Align Center
		alignCenterX(val) {
			if (val instanceof Metaplex.solid) val = val.centerX
			
			this.translate(val-this.centerX,0,0)
			return this
		}
		
		alignCenterY(val) {
			if (val instanceof Metaplex.solid) val = val.centerY
			
			this.translate(0,val-this.centerY,0)
		}
		
		alignCenterZ(val) {
			if (val instanceof Metaplex.solid) val = val.centerZ
			
			this.translate(0,0,val-this.centerZ)
			return this
		}
		
		//Align Max
		alignMaxX(val) {
			if (val instanceof Metaplex.solid) val = val.maxX
			
			this.translate(val-this.maxX,0,0)
			return this
		}
		
		alignMaxY(val) {
			if (val instanceof Metaplex.solid) val = val.maxY
			
			this.translate(0,val-this.maxY,0)
			return this
		}
		
		alignMaxZ(val) {
			if (val instanceof Metaplex.solid) val = val.maxZ
			
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
				
		copyTopOperation(ob) {
			this.operations.push(ob.lastOperation)
			return this
		}
		
		move(dx,dy,dz) {
			return this.translate(dx,dy,dz)
		}
		
		translate(dx,dy,dz) {
			if (!dz) {
				dz = 0;
			}
			
			this.operations.push(new Metaplex.operations.translate(dx,dy,dz))
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
		
		rotate(rx,ry,rz) {
			this.operations.push(new Metaplex.operations.rotate(rx,ry,rz))			
			return this
		}
		
		scale(sx,sy,sz) {
			if (typeof sy == "undefined") {
				sy = sx
				sz = sx
			}
			
			this.operations.push(new Metaplex.operations.scale(sx,sy,sz))
			return this
		}
		
		mirror(x,y,z) {
			this.operations.push(new Metaplex.operations.mirror(x,y,z))
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
		
		copy() {
			return new Metaplex.copy(this.json(),this.dimension,this.boundingBox)
		}
		
		offset(amount,mode) {
			this.operations.push(new Metaplex.operations.offset(amount,mode))
			return this
		}
		
		minkowskiAdd(ob) {
			this.operations.push(new Metaplex.operations.minkowskiAdd(ob))
			return this
		}
		
		minkowskiSub(ob) {
			this.operations.push(new Metaplex.operations.minkowskiSub(ob,this.boundingBox))
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
				this.operations.push(new Metaplex.operations.linear_extrude(height,twist,scale))
				return this
			} else {
				Metaplex.log.error('Cannot use "linear_extrude" on a 3D object.')
			}
		}
		
		rotate_extrude(degrees) {
			if (this.dimension != 3) {
				this.operations.push(new Metaplex.operations.rotate_extrude(degrees))
				return this
			} else {
				Metaplex.log.error('Cannot use "rotate_extrude" on a 3D object.')
			}
		}
		
		display_debug() {
			this.operations.push(new Metaplex.operations.display_debug())
			return this
		}
		
		color(r,g,b,a) {
			if (typeof r == "string") {
				var name = r
				var alpha = g
				if (typeof alpha == "undefined") {
					alpha = 1
				}
				this.operations.push(new Metaplex.operations.colorname(name,alpha))
			} else {
				this.operations.push(new Metaplex.operations.color(r,g,b,a))
			}
			return this
		}
		
		setFN(fn) {
			this.operations.push(new Metaplex.operations.setFN(fn))
			return this
		}
		
		add(ob) {
			this.operations.push(new Metaplex.operations.union(ob))
			return this
		}
		
		sub(ob) {
			this.operations.push(new Metaplex.operations.difference(ob))
			return this
		}
		
		and(ob) {
			this.operations.push(new Metaplex.operations.intersection(ob))
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
	,utils:{
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
	}
}

module.exports = Metaplex; //TODO: this was put here to try to allow other modules to access the utils object even when they themselves were loaded by Metaplex. Doing this worked even better than expected. Does it have any bad effects?

Metaplex.group = class extends Metaplex.solid {
	constructor() {
		super()
	}
	
	rootjson() {
		return {
			type:"empty"
		}
	}
}

Metaplex.copy = class extends Metaplex.solid {
	constructor(json,dimension,bounds) {
		super()
		this.rootdimension = dimension
		this.rootboundingbox = bounds
		this.parent = json
	}
	
	rootjson() {
		return this.parent
	}
}

//TODO: work on rotation bounding box size increase build up
Metaplex.operation = class {
	constructor() {
		
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
}

Metaplex.operations = {
	translate:class extends Metaplex.operation {
		constructor(x,y,z) {
			super()
			this.x = x
			this.y = y
			this.z = z
			
			Metaplex.utils.checkValues(this)
		}
		
		get matrix() {
			return new Metaplex.mat4().translate(this.x,this.y,this.z)
		}
		
		transformDimension(d) {
			return d
		}
		
		json(child) {
			return {
				type:"translate"
				,x:this.x
				,y:this.y
				,z:this.z
				,child:child				
			}
		}		
	}

	,rotate:class extends Metaplex.operation {
		constructor(x,y,z) {
			super()
			this.x = x
			this.y = y
			this.z = z
			
			Metaplex.utils.checkValues(this)
		}
		
		get matrix() {
			return new Metaplex.mat4().rotateMultiple(Metaplex.utils.degreesToRadians(this.x),Metaplex.utils.degreesToRadians(this.y),Metaplex.utils.degreesToRadians(this.z))
		}
		
		transformDimension(d) {
			return d
		}

		json(child) {
			return {
				type:"rotate"
				,x:this.x
				,y:this.y
				,z:this.z
				,child:child		
			}
		}		
	}
	
	,scale:class extends Metaplex.operation {
		constructor(x,y,z) {
			super()
			this.x = x
			this.y = y
			this.z = z
			
			Metaplex.utils.checkValues(this)
		}
		
		get matrix() {
			return new Metaplex.mat4().scale(this.x,this.y.this.z)
		}
		
		transformDimension(d) {
			return d
		}		
		
		json(child) {
			return {
				type:"scale"
				,x:this.x
				,y:this.y
				,z:this.z
				,child:child			
			}
		}
	}
	
	,mirror:class extends Metaplex.operation {
		constructor(x,y,z) {
			super()
			this.x = x
			this.y = y
			this.z = z
			
			Metaplex.utils.checkValues(this)
		}
		
		
		get matrix() { //TODO: this isn't correct, but it will do for single-axis mirrors.
			//See https://en.wikipedia.org/wiki/Householder_transformation
			var sx = this.x
			var sy = this.y
			var sz = this.z
			if (sx == 0) sx=-1
			if (sy == 0) sy=-1
			if (sz == 0) sz=-1
			
			return new Metaplex.mat4().scale(-sx,-sy,-sz)
		}
		
		json(child) {
			return {
				type:"mirror"
				,x:this.x
				,y:this.y
				,z:this.z
				,child:child			
			}
		}
	}
	
	,union:class extends Metaplex.operation {
		constructor(ob) {
			super()
			this.ob = ob
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.boundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
					
			minX = Math.min(minXa,minXb)
			maxX = Math.max(maxXa,maxXb)
			
			minY = Math.min(minYa,maxYb)
			maxY = Math.max(minYa,maxYb)
			
			minZ = Math.min(minZa,maxZb)
			maxZ = Math.max(minZa,maxZb)
			
			return [[minX,minY,minZ],[maxX,maxY,maxZ]]
		}
		
		json(child) {
			var ob1 = child
			var ob2 = this.ob.json()
			return {
				type:"union"
				,child1:ob1
				,child2:ob2
			}			
		}		
	}
	,difference:class extends Metaplex.operation {
		constructor(ob) {
			super()
			this.ob = ob
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) { //Difference cannot increase the size of the box, and we don't have enough information to decide if it decreases it, so we just return the original box.
			return Metaplex.utils.copyBoundingBox(b)
		}
		
		json(child) {
			var ob1 = child
			var ob2 = this.ob.json()
			return {
				type:"difference"
				,child1:ob1
				,child2:ob2
			}			
		}		
	}
	,intersection:class extends Metaplex.operation {
		constructor(ob) {
			super()
			this.ob = ob
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.boundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
					
			minX = Math.max(minXa,minXb) //Notice this is Math.max, not min.
			maxX = Math.min(maxXa,maxXb)
			
			minY = Math.max(minYa,maxYb)
			maxY = Math.min(minYa,maxYb)
			
			minZ = Math.max(minZa,maxZb)
			maxZ = Math.min(minZa,maxZb)
			
			return [[minX,minY,minZ],[maxX,maxY,maxZ]]
		}
		
		json(child) {
			var ob1 = child
			var ob2 = this.ob.json()
			return {
				type:"intersection"
				,child1:ob1
				,child2:ob2
			}			
		}		
	}
	
	,linear_extrude:class extends Metaplex.operation {
		constructor(height,twist,scale) {
			super()
			this.height = height
			this.twist = twist
			this.scale = scale
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return 3
		}
		
		
		//TODO: implement twist and scale
		transformBoundingBox(b) {
			var minX = b[0][0]
			var minY = b[0][1]
			var minZ = b[0][2]
			var maxX = b[1][0]
			var maxY = b[1][1]
			var maxZ = b[1][2]
			
			return [[minX,minY,0],[maxX,maxY,this.height]]
		}
		
		json(child) {
			return {
				type:"linear_extrude"
				,height:this.height
				,twist:this.twist
				,scale:this.scale
				,child:child
			}			
		}		
	}
	
	,rotate_extrude:class extends Metaplex.operation {
		constructor(angle) {
			super()
			this.angle = angle
			
			Metaplex.utils.checkValues(this)
		}
		
		//TODO: angle is not implemented
		transformBoundingBox(b) {
			var minX = b[0][0]
			var minY = b[0][1]
			var minZ = b[0][2]
			var maxX = b[1][0]
			var maxY = b[1][1]
			var maxZ = b[1][2]
			
			return [[-maxX,-maxX,minY],[maxX,maxX,maxY]]
		}
		
		transformDimension(d) {
			return 3
		}
		
		json(child) {
			return {
				type:"rotate_extrude"
				,angle:this.angle
				,child:child
			}			
		}		
	}
	
	,minkowskiAdd:class extends Metaplex.operation {
		constructor(ob) {
			super()
			this.ob = ob
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.boundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
			
			var minX = Math.min(minXa,minXa+minXb)
			var maxX = Math.max(maxXa,maxXa+maxXb)
			
			var minY = Math.min(minYa,minYa+minYb)
			var maxY = Math.max(maxYa,maxYa+maxYb)
			
			var minZ = Math.min(minZa,minZa+minZb)
			var maxZ = Math.max(maxZa,maxZa+maxZb)
			
			return [[minX,minY,minZ],[maxX,maxY,maxZ]]
		}
		
		json(child) {
			var ob1 = child
			var ob2 = this.ob.json()
			return {
				type:"minkowskiAdd"
				,child1:ob1
				,child2:ob2
			}			
		}		
	}
	
	//EXPERIMENTAL!!
	//For other ideas/CGAL discussion, see http://cgal-discuss.949826.n4.nabble.com/Re-Any-idea-about-Minkowski-difference-td3166601.html
	,minkowskiSub:class extends Metaplex.operation {
		constructor(ob,bounds) {
			super()
			this.ob = ob
			this.parentBoundingBox = bounds
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) { //TODO
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.boundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
			
			var minX = Math.min(minXa,minXa+minXb)
			var maxX = Math.max(maxXa,maxXa+maxXb)
			
			var minY = Math.min(minYa,minYa+minYb)
			var maxY = Math.max(maxYa,maxYa+maxYb)
			
			var minZ = Math.min(minZa,minZa+minZb)
			var maxZ = Math.max(maxZa,maxZa+maxZb)
			
			return [[minX,minY,minZ],[maxX,maxY,maxZ]]
		}
		
		json(child) {
			var margin = 50
			
			var minX = this.parentBoundingBox[0][0]-margin
			var minY = this.parentBoundingBox[0][1]-margin
			var minZ = this.parentBoundingBox[0][2]-margin
			var maxX = this.parentBoundingBox[1][0]+margin
			var maxY = this.parentBoundingBox[1][1]+margin
			var maxZ = this.parentBoundingBox[1][2]+margin
			
			var boundingBox = new Metaplex.primitives.box(maxX-minX,maxY-minY,maxZ-minZ).translate(minX,minY,minZ);
			var box = boundingBox.copy();
			box.sub(new Metaplex.copy(child,3)) //Child is in JSON, so we have to use copy 
			box.minkowskiAdd(this.ob)
			boundingBox.sub(box)
			return boundingBox.json();
		}		
	}
	
	,offset:class extends Metaplex.operation {
		constructor(distance,mode) {
			super()
			this.distance = distance
			this.mode = mode
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			var minX = b[0][0]
			var minY = b[0][1]
			var minZ = b[0][2]
			var maxX = b[1][0]
			var maxY = b[1][1]
			var maxZ = b[1][2]
			
			this.d = this.distance			
			
			return [[minX-d,minY-d,minZ-d],[maxX+d,maxY+d,maxZ+d]]
		}
		
		json(child) {
			return {
				type:"offset"
				,distance:this.distance
				,mode:this.mode
				,child:child
			}			
		}		
	}
	
	,setFN:class extends Metaplex.operation {
		constructor(fn) {
			super()
			this.fn = fn
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			return Metaplex.utils.copyBoundingBox(b)
		}
		
		json(child) {
			return {
				type:"$fn"
				,fn:this.fn
				,child:child
			}			
		}		
	}
	
	,color:class extends Metaplex.operation {
		constructor(r,g,b,a) {
			super()

			this.r = r
			this.g = g
			this.b = b
			this.a = a	
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			return Metaplex.utils.copyBoundingBox(b)
		}
		
		json(child) {
			return {
				type:"colorrgba"
				,r:this.r
				,g:this.g
				,b:this.b
				,a:this.a
				,child:child
			}			
		}		
	}
	
	,colorname:class extends Metaplex.operation {
		constructor(name,alpha) {
			super()
			this.name = name
			this.alpha= alpha
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformBoundingBox(b) {
			return Metaplex.utils.copyBoundingBox(b)
		}

		json(child) {
			return {
				type:"colorname"
				,name:this.name
				,alpha:this.alpha
				,child:child
			}			
		}		
	}
}




Metaplex.primitives = {
	importPath:class extends Metaplex.solid {
		constructor(path) {
			super()
			this.path = path
			this.rootdimension = 3
			
			Metaplex.utils.checkValues(this)
		}
		
		rootjson() {
			return {
				type:"import"
				,path:this.path
			}
		}		
	}
	,sphere:class extends Metaplex.solid{			
		constructor(radius) {
			super()
			this.rootdimension = 3
			this.radius = radius
			
			Metaplex.utils.checkValues(this)
			this.rootboundingbox = [[-this.radius,-this.radius,-this.radius],[this.radius,this.radius,this.radius]]
		}
		
		rootjson() {
			return {
				type:"sphere"
				,radius:this.radius			
			}
		}
	}
	,cylinder:class extends Metaplex.solid{
		constructor(height,radius) {
			super()
			this.rootdimension = 3
			this.height = height
			this.radius = radius
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,this.height]]
		}
		
		rootjson() {
			return {
				type:"cylinder"
				,height:this.height
				,radius:this.radius
			}
		}
	}
	,cone:class extends Metaplex.solid {
		constructor(height,r1,r2) {
			super()
			this.rootdimension = 3
			this.height = height
			this.radius1 = r1
			if (!r2) {
				r2 = 0
			}
			this.radius2 = r2
			this.maxRadius = Math.max(this.radius1,this.radius2)
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[-this.maxRadius,-this.maxRadius,0],[this.maxRadius,this.maxRadius,this.height]]
		}
		
		rootjson() {
			return {
				type:"cone"
				,height:this.height
				,radius1:this.radius1
				,radius2:this.radius2
			}
		}		
	}
	,box:class extends Metaplex.solid {
		constructor(width,depth,height) {
			super()
			this.rootdimension = 3
			if (typeof depth == "undefined") {
				depth = width
				height = width
			} 
			
			this.width = width
			this.depth = depth
			this.height = height
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[0,0,0],[this.width,this.depth,this.height]] 
		}
		
		rootjson() {
			return {
				type:"box"
				,width:this.width
				,depth:this.depth
				,height:this.height
			}
		}
	}
	,wedge:class extends Metaplex.solid {
		constructor(height,radius,angle,center) {
			super();
			this.rootdimension = 3
			this.height = height
			this.radius = radius
			this.SIZE = this.height
			if (this.radius > this.height) {
				this.SIZE = this.radius
			}
			this.angle = angle
			if (center) {
				this.rotz(-this.angle/2)
			}
			
			Metaplex.utils.checkValues(this)
			
			//TODO: this is just the same as the cylinder calculation. Doesn't account for angle
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,this.height]]
		}
		
		rootjson() {
			var out = []
			var out = new Metaplex.primitives.cylinder(this.height,this.radius)
			if (this.angle <= 90) {
				if (this.angle < 90) {
					out.and(new Metaplex.primitives.cube(this.SIZE*1.02).rotz(this.angle-90).translate(0,0,-0.01))
				}				
				out.and(new Metaplex.primitives.cube(this.SIZE*1.02))
			} else if (this.angle <= 180) {
				out.sub(new Metaplex.primitives.cube(this.SIZE*2*1.02).translate(-this.SIZE*1.02,-this.SIZE*2*1.02,-0.01))
				if (this.angle < 180) {
					out.sub(new Metaplex.primitives.cube(this.SIZE*2*1.02).translate(-this.SIZE*1.02,0,-0.01).rotz(this.angle))
				}
			} else {
				Metaplex.log.error("Wedge angles > 180 are currently not supported. Angle = "+this.angle)
			}
			
			
			return out.json();
			
		}
		
	}
	,torus:class extends Metaplex.solid {
		constructor(majorRadius,minorRadius) {
			super();
			this.rootdimension = 3
			this.majorRadius = majorRadius
			this.minorRadius = minorRadius
			
			Metaplex.utils.checkValues(this)
			
			var radius = this.majorRadius+this.minorRadius
			this.rootboundingbox = [[-radius,-radius,-this.minorRadius],[radius,radius,this.minorRadius]]
		}
		
		rootjson() {
			var out = new Metaplex.primitives.circle(this.minorRadius)
			out.translate(this.majorRadius,0,0)
			out.rotate_extrude(360,10)
			return out.json();
		}
	}
	,circle:class extends Metaplex.solid {
		constructor(radius) {
			super();
			this.rootdimension = 2 
			this.radius = radius
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,0]]
		}
		
		rootjson() {
			return {
				type:"circle"
				,radius:this.radius
			}
		}		
	}
	,ngon:class extends Metaplex.solid {
		constructor(radius,sides) {
			super();
			this.rootdimension = 2
			this.radius = radius
			this.sides = sides
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,0]]
		}
		
		rootjson() {
			return {
				type:"$fn"
				,fn:this.sides
				,child:{
					type:"circle"
					,radius:this.radius
				}
			}
		}		
	}
	,nprism:class extends Metaplex.solid {
		constructor(height,radius,sides) {
			super();
			this.rootdimension = 3
			this.height = height
			this.radius = radius
			this.sides = sides
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,this.height]]
		}
		
		rootjson() {
			return {
				type:"$fn"
				,fn:this.sides
				,child:{
					type:"cylinder"
					,height:this.height
					,radius:this.radius
				}
			}
		}		
	}
	//Metaplex.primitives.rectangle = Metaplex.primitves.square. See below.
	,square:class extends Metaplex.solid {
		constructor(x,y) {
			super();
			if (typeof y == "undefined") {
				y = x
			}
			this.rootdimension = 2
			this.width = x
			this.depth = y
			
			Metaplex.utils.checkValues(this)
			
			this.rootboundingbox = [[0,0,0],[this.width,this.depth,0]]
		}
		
		rootjson() {
			return {
				type:"rectangle"
				,x:this.width
				,y:this.depth
			}
		}		
	}
	,arc:class extends Metaplex.solid {
		constructor(radius,angle,center) {
			super();
			this.rootdimension = 2
			this.radius = radius
			this.angle = angle
			if (center) {
				this.rotz(-this.angle/2)
			}
			
			Metaplex.utils.checkValues(this)
			
			//TODO: this is just the same as circle
			this.rootboundingbox = [[-this.radius,-this.radius,0],[this.radius,this.radius,0]]
		}
		
		rootjson() {
			
			var out = new Metaplex.primitives.circle(this.radius)
			if (this.angle <= 90) {
				if (this.angle < 90) {
					out.and(new Metaplex.primitives.square(this.radius*1.02).rotz(this.angle-90))
				}				
				out.and(new Metaplex.primitives.square(this.radius*1.02))
			} else if (this.angle <= 180) {
				out.sub(new Metaplex.primitives.square(this.radius*2*1.02).translate(-this.radius*1.02,-this.radius*2*1.02,0))
				if (this.angle < 180) {
					out.sub(new Metaplex.primitives.square(this.radius*2*1.02).translate(-this.radius*1.02,0,0).rotz(this.angle))
				}
			} else {
				Metaplex.log.error("Wedge angles > 180 are currently not supported. Angle = "+this.angle)
			}
			
			
			return out.json();
		}		
	}
	,polygon:class extends Metaplex.solid {
		constructor(points) {			
			super();
			this.rescaleFactor = 1000
			
			this.rootdimension = 2
			this.points = []
			var minX = 0
			var minY = 0
			var maxX = 0
			var maxY = 0
			for (var i = 0; i<points.length; i++) {
				var point = points[i]
				var x = point[0]
				var y = point[1]
				if (x < minX) {
					minX = x
				} else if (x > maxX) {
					maxX = x
				}
				if (y < minY) {
					minY = y
				} else if (y > maxY) {
					maxY = y
				}
				
				x*=this.rescaleFactor
				y*=this.rescaleFactor
				this.points.push([x,y])
			}
			
			this.rootboundingbox = [[minX,minY,0],[maxX,maxY,0]]
			
			Metaplex.utils.checkValues(this)			
		}
		
		rootjson() {
			return { //rescale to work around https://github.com/openscad/openscad/issues/999
				type:"scale"
				,x:1/this.rescaleFactor
				,y:1/this.rescaleFactor
				,z:1
				,child:{
					type:"polygon"
					,points:this.points
				}
			}
		}
		
	}
	,text:class extends Metaplex.solid {
		constructor(text,size,font,options) {
			super();
			this.text = text
			this.size = size
			this.font = font
			this.halign = options.halign || "left"
			this.valign = options.valign || "baseline"
			this.spacing = options.spacing || 1
			this.direction = options.direction || "ltr"
			this.language = options.language || "en"
			this.script = options.script || "latin"
			this.rootdimension = 2
			//TODO: make root bounding box
			Metaplex.utils.checkValues(this)
		}	
		
		
		
		rootjson() {
			return {
				type:"text"
				,text:this.text
				,size:this.size
				,font:this.font
				,halign:this.halign
				,valign:this.valign
				,spacing:this.spacing
				,direction:this.direction
				,language:this.language
				,script:this.script
			}
		}
		
	}
	,threads:class extends Metaplex.solid {
		constructor(helixRadius,threadRadius,pitch,length,options) {
			super()
			this.rootdimension = 3
			this.helixRadius = helixRadius
			this.threadRadius = threadRadius
			this.options = options || {}
			this.pitch = pitch
			this.length = length
			//TODO: make root bounding box
			Metaplex.utils.checkValues(this)
		}
	
		rootjson() {
			var twist = -(this.length/this.pitch)*360
			var stretch =1/(Math.sin(Math.atan2(this.pitch,2*Math.PI*this.helixRadius)))
			var points = []
			var npoints = this.options.fn
			var helixRadius = this.helixRadius
			var threadRadius =this.threadRadius
			for (var i = 0; i<npoints; i++) {
				var circleangle = 2*Math.PI*(i/npoints)
				var x = threadRadius*Math.cos(circleangle)
				var y = threadRadius*Math.sin(circleangle)
				x+=helixRadius
				
				var r = Math.sqrt(x*x+y*y)
				var theta = Math.atan2(y,x)
				
				theta *= stretch //Scale the polygon to account for the stretching that occurs in twisting
				
				x = r*Math.cos(theta)
				y = r*Math.sin(theta)
				points.push([x,y])				
			}
			
			var startAngle = (threadRadius*stretch)/(2*Math.PI*helixRadius)*360 //Angle from which the threads are fully not cross sectioned
			//Make two wedges to make it less likely for the wedge to cut off the bottom of the next layer of threads. One the second wedge is shorter.
			var startWedge1 = new Metaplex.primitives.wedge(threadRadius*2+0.02,helixRadius+threadRadius+0.1,startAngle).translate(0,0,-0.01)
			var startWedge2 = new Metaplex.primitives.wedge(threadRadius*1.1+0.02,helixRadius+threadRadius+0.1,startAngle).translate(0,0.0001,-0.01).rotz(-startAngle) //Notice this is slightly more than half as tall as the other wedge
			
			var endAngle = twist-startAngle //Angle at which the threads end at the top
			var endWedge1 = new Metaplex.primitives.wedge(threadRadius*2+0.02,helixRadius+threadRadius+0.1,startAngle).translate(0,0,this.length-(threadRadius*2+0.01)).rotz(-endAngle-startAngle*2+0.1)
			var endWedge2 = new Metaplex.primitives.wedge(threadRadius*1.1+0.02,helixRadius+threadRadius+0.1,startAngle).translate(0,0,this.length-(threadRadius*1.1+0.01)).rotz(-endAngle-startAngle)
			
			var out = new Metaplex.primitives.polygon(points)
			out.linear_extrude(this.length,twist)
			out.sub(startWedge1)
			out.sub(startWedge2)
			out.sub(endWedge1)
			out.sub(endWedge2)
			return out.json();
			
			//return Metaplex.listTransforms(this)+"{\n+ linear_extrude "+this.length+" "+10+" "+twist+" "+1+" polygon "+JSON.stringify({points:points})+"\n- "+startWedge1.list()+"\n- "+startWedge2.list()+"\n- "+endWedge1.list()+"\n- "+endWedge2.list()+"\n}"
		}		
	}
	

}

Metaplex.primitives.rectangle = Metaplex.primitives.square
Metaplex.primitives.rect = Metaplex.primitives.square
Metaplex.primitives.cube = Metaplex.primitives.box

Metaplex.vec3 = class Vec3 {
	constructor (x,y,z) {
		if (!x) {x = 0}
		if (!y) {y = 0}
		if (!z) {z = 0}
		
		this.x = x
		this.y = y
		this.z = z
		
		this.updateMagnitude();
	}
	
	duplicate() { //Returns a new Metaplex.vec3 with exactly the same parameters as this one
		return new Metaplex.vec3(this.x,this.y,this.z)
	}
	
	updateMagnitude() {
		var x = this.x
		var y = this.y
		var z = this.z
		
		this.magnitude = Math.sqrt(x*x+y*y+z*z)
	}
	
	normalize() {
		var x = this.x
		var y = this.y
		var z = this.z
		
		//this.updateMagnitude();
		
		if (this.magnitude == Infinity) {
			if (x == Infinity) {
				x = 1
				y = 0
				z = 0
			}
			if (y == Infinity) {
				x = 0
				y = 1
				z = 0
			}
			if (z == Infinity) {
				x = 0
				y = 0
				z = 1
			}
			if (x == -Infinity) {
				x = -1
				y = 0
				z = 0
			}
			if (y == -Infinity) {
				x = 0
				y = -1
				z = 0
			}
			if (z == -Infinity) {
				x = 0
				y = 0
				z = -1
			}
		} else {		
			x /= this.magnitude
			y /= this.magnitude
			z /= this.magnitude
		}
		
		return new Metaplex.vec3(x,y,z)	
	}
	
	scale(factor) { //Multiply all the components of a vector by a constant
		var x = this.x
		var y = this.y
		var z = this.z

		x*=factor
		y*=factor
		z*=factor
		
		return new Metaplex.vec3(x,y,z)
	}
	
	add(vector) { //Add each component of another vector to that component of this vector (add x1 + x2, y1 + y2, etc)
		var x = this.x
		var y = this.y
		var z = this.z
	
		x += vector.x
		y += vector.y
		z += vector.z
		
		return new Metaplex.vec3(x,y,z)
	}
	
	subtract(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x -= vector.x
		y -= vector.y
		z -= vector.z
		
		return new Metaplex.vec3(x,y,z)		
	}
	
	multiply(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x *= vector.x
		y *= vector.y
		z *= vector.z
		
		return new Metaplex.vec3(x,y,z)		
	}
	
	divide(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x /= vector.x
		y /= vector.y
		z /= vector.z
		
		return new Metaplex.vec3(x,y,z)		
	}
	
	
	constantDivideBy(constant) { //Divide a constant by this vector
		var x = this.x
		var y = this.y
		var z = this.z
	
		x = constant/x
		y = constant/y
		z = constant/z
		
		return new Metaplex.vec3(x,y,z)		
	}
	
	dotProduct(vector) { //Note that this returns a NUMBER not a vector
		var x1 = this.x
		var y1 = this.y
		var z1 = this.z
		
		var x2 = vector.x
		var y2 = vector.y
		var z2 = vector.z
		
		var px = x1*x2
		var py = y1*y2
		var pz = z1*z2
		
		return px+py+pz
	}
	
	reflect(normal) {
		return this.subtract(normal.scale(this.dotProduct(normal)*2))
	}
	
	toString() {
		return "("+this.x+","+this.y+","+this.z+")"
	}
	
	arr() {
		return [this.x,this.y,this.z]
	}	
	
}

Metaplex.glmat4 = require("gl-mat4")


Metaplex.mat4 = class {
	constructor(arr) {
		if (!arr) {
			this.data = Metaplex.glmat4.create();
		} else {
			this.data = arr
		}
	}
	
	clone() {
		return Metaplex.glmat4.clone(this.data)
	}
	
	/*
	 0  1  2  3
	 4  5  6  7
	 8  9 10 11
	12 13 14 15
	*/
	
	transform(a,b,c) {
		/*
		Transforms a point using the matrix.
		
		Has 3 input/output modes
		
		transform(vec3) -> vec3
		transform([x,y,z]) -> [x,y,z]
		transform(x,y,z) -> [x,y,z]
		
		*/		
		var x
		var y
		var z
		
		var mode = 0;
		if (a instanceof Metaplex.vec3) {
			x = a.x
			y = a.y
			z = a.z;
			mode = 0
		} else if (typeof b != "undefined") {
			x = a
			y = b
			z = c
			mode = 1
		} else { //array
			x = a[0]
			y = a[1]
			z = a[2]
			mode = 1
		}
		var w = 1
		
		var m = this.data
		
		var outX = m[0]*x+m[4]*y+m[8]*z+m[12]*w
		var outY = m[1]*x+m[5]*y+m[9]*z+m[13]*w
		var outZ = m[2]*x+m[6]*y+m[10]*z+m[14]*w
		//var outW = m[3]*x+m[7]*y+m[11]*z+m[15]*w
	
		
		if (mode == 0) {
			return new Metaplex.vec3(outX,outY,outZ)
		} else {
			return [outX,outY,outZ]
		}
	}
	
	invert() {
		var out = []
		Metaplex.glmat4.invert(out,this.clone())
		return out
	}
	
	translate(a,b,c) {
		var arr;
		if (a instanceof Metaplex.vec3) {
			arr = vec3.arr();
		} else if (typeof b != "undefined") {
			arr = [a,b,c]
		} else {
			arr = a
		}
		var out = []
		Metaplex.glmat4.translate(out,this.data,arr)
		return new Metaplex.mat4(out)
	}
	
	scale(a,b,c) {
		var arr;
		if (a instanceof Metaplex.vec3) {
			arr = vec3.arr();
		} else if (typeof b != "undefined") {
			arr = [a,b,c]
		} else {
			arr = a
		}
		var out = []
		Metaplex.glmat4.translate(out,this.data,arr)
		return new Metaplex.mat4(out)
	}
	
	rotateX(angle) {
		var out = []
		Metaplex.glmat4.rotateX(out,this.data,angle)
		return new Metaplex.mat4(out)
	}
	
	rotateY(angle) {
		var out = []
		Metaplex.glmat4.rotateY(out,this.data,angle)
		return new Metaplex.mat4(out)
	}
	
	rotateZ(angle) {
		var out = []
		Metaplex.glmat4.rotateZ(out,this.data,angle)
		return new Metaplex.mat4(out)
	}
	
	rotateMultiple(x,y,z) {
		return this.rotateX(x).rotateY(y).rotateZ(z)
	}
	
	invert() {
		var out = []
		Metaplex.glmat4.invert(out,this.data)
		return new Metaplex.mat4(out)
	}
	
	toString() {
		var lines = []
		lines.push("["+this.data.slice(0,4).join(",")+"]")
		lines.push(" ["+this.data.slice(4,8).join(",")+"]")
		lines.push(" ["+this.data.slice(8,12).join(",")+"]")
		lines.push(" ["+this.data.slice(12,16).join(",")+"]")
		return "["+lines.join("\n")+"]"
	}
}


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