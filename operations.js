var Metaplex = require("./metaplex.js")
var mat4 = require("./mat4.js")

module.exports = {
	translate:class extends Metaplex.operation {
		constructor(vec) {
			super()
			this.delta = vec.fill()
			
			Metaplex.utils.checkValues(this)
		}
		
		get matrix() {
			return new mat4().translate(this.delta)
		}
		
		transformDimension(d) {
			return d
		}
		
		json(child) {
			return {
				type:"translate"
				,x:this.delta.x
				,y:this.delta.y
				,z:this.delta.z
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
			return new mat4().rotateMultiple(Metaplex.utils.degreesToRadians(this.x),Metaplex.utils.degreesToRadians(this.y),Metaplex.utils.degreesToRadians(this.z))
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
			return new mat4().scale(this.x,this.y,this.z)
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
	
	,multmatrix:class extends Metaplex.operation {
		constructor(matrix) {
			super()
			this.matrix = matrix
		}

		transformDimension(d) {
			return d
		}
		
		json(child) {
			return {
				type:"multmatrix"
				,matrix:this.matrix.arr()
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

		transformDimension(d) {
			return d
		}		
		
		get matrix() { //TODO: this isn't correct, but it will do for single-axis mirrors.
			//See https://en.wikipedia.org/wiki/Householder_transformation
			var sx = this.x
			var sy = this.y
			var sz = this.z
			if (sx == 0) sx=-1
			if (sy == 0) sy=-1
			if (sz == 0) sz=-1
			
			return new mat4().scale(-sx,-sy,-sz)
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
			ob.isChild = true
			this.isMultichild = true
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		applyToChildren(operation) {
			this.ob.applyParentOperation(operation)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.ownBoundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
					
			var minX = Math.min(minXa,minXb)
			var maxX = Math.max(maxXa,maxXb)
			
			var minY = Math.min(minYa,minYb)
			var maxY = Math.max(maxYa,maxYb)
			
			var minZ = Math.min(minZa,minZb)
			var maxZ = Math.max(maxZa,maxZb)
			
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
			ob.isChild = true
			this.isMultichild = true
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		applyToChildren(operation) {
			this.ob.applyParentOperation(operation)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
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
			ob.isChild = true
			this.isMultichild = true
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		applyToChildren(operation) {
			this.ob.applyParentOperation(operation)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.ownBoundingBox
			
			var minXb = obBounds[0][0]
			var minYb = obBounds[0][1]
			var minZb = obBounds[0][2]
			var maxXb = obBounds[1][0]
			var maxYb = obBounds[1][1]
			var maxZb = obBounds[1][2]
					
			var minX = Math.max(minXa,minXb) //Notice this is Math.max, not min.
			var maxX = Math.min(maxXa,maxXb)
			
			var minY = Math.max(minYa,maxYb)
			var maxY = Math.min(minYa,maxYb)
			
			var minZ = Math.max(minZa,maxZb)
			var maxZ = Math.min(minZa,maxZb)
			
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
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return 3
		}
		
		transformPoint(p) {
			return p.slice(0);
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
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformPoint(p) {
			return p.slice(0);
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
			ob.isChild = true
			this.isMultichild = true
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		applyToChildren(operation) {
			this.ob.applyParentOperation(operation)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
		}
		
		transformBoundingBox(b) {
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.ownBoundingBox
			
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
			ob.isChild = true
			this.isMultichild = true
			this.isLocationTransform = false
			this.parentBoundingBox = bounds
			
			Metaplex.utils.checkValues(this)
		}
		
		applyToChildren(operation) {
			this.ob.applyParentOperation(operation)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
		}
		
		transformBoundingBox(b) { //TODO
			var minXa = b[0][0]
			var minYa = b[0][1]
			var minZa = b[0][2]
			var maxXa = b[1][0]
			var maxYa = b[1][1]
			var maxZa = b[1][2]
			
			var obBounds = this.ob.ownBoundingBox
			
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
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
		}
		
		transformBoundingBox(b) {
			var minX = b[0][0]
			var minY = b[0][1]
			var minZ = b[0][2]
			var maxX = b[1][0]
			var maxY = b[1][1]
			var maxZ = b[1][2]
			
			var d = this.distance			
			
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
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
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
			
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
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
			this.isLocationTransform = false
			
			Metaplex.utils.checkValues(this)
		}
		
		transformDimension(d) {
			return d
		}
		
		transformPoint(p) {
			return p.slice(0);
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