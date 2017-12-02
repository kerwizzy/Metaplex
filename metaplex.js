const fs = require("fs")


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
			this.operations.push(new Metaplex.operations.scale(sx,sy,sz))
			return this
		}
		
		copy() {
			return new Metaplex.copy(this.json(),this.dimension)
		}
		
		offset(amount,mode) {
			this.operations.push(new Metaplex.operations.offset(amount,mode))
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
				throw 'Cannot use "linear_extrude" on a 3D object.'
			}
		}
		
		rotate_extrude(degrees) {
			console.log("Dim = "+this.dimension)
			if (this.dimension != 3) {
				this.operations.push(new Metaplex.operations.rotate_extrude(degrees))
				return this
			} else {
				throw 'Cannot use "rotate_extrude" on a 3D object.'
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
		}
		
		sub(ob) {
			this.operations.push(new Metaplex.operations.difference(ob))
		}
		
		and(ob) {
			this.operations.push(new Metaplex.operations.intersection(ob))
		}
		
		json() {
			var out = this.rootjson()
			for (var i = 0; i<this.operations.length; i++) {
				var op = this.operations[i]
				out = op.json(out)
			}
			return out
		}
		
		save(path,options) {
			Metaplex.save(this.json(),path,options)
		}		
	}
}

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
	constructor(json,dimension) {
		super()
		this.dimension = dimension
		this.parent = json
	}
	
	rootjson() {
		return this.parent
	}
}

Metaplex.operation = class {
	constructor() {
		
	}	
}

Metaplex.operations = {
	translate:class extends Metaplex.operation {
		constructor(x,y,z) {
			super()
			this.x = x
			this.y = y
			this.z = z
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
	
	,union:class extends Metaplex.operation {
		constructor(ob) {
			super()
			this.ob = ob
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
			this.dimension = 3
			this.height = height
			this.twist = twist
			this.scale = scale
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
			this.dimension = 3
		}
		
		json(child) {
			return {
				type:"rotate_extrude"
				,angle:this.angle
				,child:child
			}			
		}		
	}
	
	,offset:class extends Metaplex.operation {
		constructor(distance,mode) {
			super()
			this.distance = distance
			this.mode = mode
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
			this.dimension = 3
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
			this.dimension = 3
			this.radius = radius
		}
		
		rootjson() {
			return {
				type:"sphere"
				,radius:this.radius			
			}
		}
	}	
	,cube:class extends Metaplex.solid{
		constructor(size) {
			super()
			this.dimension = 3
			this.size = size
		}
		
		rootjson() {
			return {
				type:"cube"
				,size:this.size
			}
		}
	}
	,cylinder:class extends Metaplex.solid{
		constructor(height,radius) {
			super()
			this.dimension = 3
			this.height = height
			
			this.radius = radius
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
			this.dimension = 3
			this.height = height
			this.radius1 = r1
			if (!r2) {
				r2 = 0
			}
			this.radius2 = r2
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
			this.dimension = 3
			this.width = width
			this.depth = depth
			this.height = height
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
			this.dimension = 3
			this.height = height
			this.radius = radius
			this.angle = angle
			this.center = center
			if (center) {
				this.rotz(-this.angle/2)
			}
		}
		
		rootjson() {
			var out = []
			var out = new Metaplex.primitives.cylinder(this.height,this.radius)
			if (this.angle <= 90) {
				if (this.angle < 90) {
					out.and(new Metaplex.primitives.cube(this.radius*1.02).rotz(this.angle-90).translate(0,0,-0.01))
				}				
				out.and(new Metaplex.primitives.cube(this.radius*1.02))
			} else if (this.angle <= 180) {
				out.sub(new Metaplex.primitives.cube(this.radius*2*1.02).translate(-this.radius*1.02,-this.radius*2*1.02,-0.01))
				if (this.angle < 180) {
					out.sub(new Metaplex.primitives.cube(this.radius*2*1.02).translate(-this.radius*1.02,0,-0.01).rotz(this.angle))
				}
			} else {
				throw "Error: Angles > 180 are currently not supported. Angle = "+this.angle
			}
			
			
			return out.json();
			
		}
		
	}
	,torus:class extends Metaplex.solid {
		constructor(majorRadius,minorRadius) {
			super();
			this.dimension = 3
			this.majorRadius = majorRadius
			this.minorRadius = minorRadius
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
			this.dimension = 2
			this.radius = radius
		}
		
		rootjson() {
			return {
				type:"circle"
				,radius:this.radius
			}
		}		
	}
	,square:class extends Metaplex.solid {
		constructor(size) {
			super();
			this.dimension = 2
			this.size = size
		}
		
		rootjson() {
			return {
				type:"square"
				,size:this.size
			}
		}		
	}
	,arc:class extends Metaplex.solid {
		constructor(radius,angle,center) {
			super();
			this.dimension = 2
			this.radius = radius
			this.angle = angle
			if (center) {
				this.rotz(-this.angle/2)
			}
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
				throw "Error: Angles > 180 are currently not supported. Angle = "+this.angle
			}
			
			
			return out.json();
		}		
	}
	,polygon:class extends Metaplex.solid {
		constructor(points) {
			super();
			this.dimension = 2
			this.points = points
		}
		
		rootjson() {
			return {
				type:"polygon"
				,points:this.points
			}
		}
		
	}
	,threads:class extends Metaplex.solid {
		constructor(helixRadius,threadRadius,pitch,length,options) {
			super()
			this.dimension = 3
			this.helixRadius = helixRadius
			this.threadRadius = threadRadius
			this.options = options
			this.pitch = pitch
			this.length = length
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
	,slopeStretch(m) {
		return 1/(Math.sin(Math.atan(m)))
	}
}

Metaplex.save = function(list,path,options) {
	var type = Metaplex.utils.getExtension(path)
	Metaplex.exporters[type].save(list,path,options)
}

Metaplex.exporters = {}


Metaplex.exporters.scad = {
	parse:require(__dirname+"/exporters/scad.js")
	,save:function(list,path,options) {
		fs.writeFileSync(path,Metaplex.exporters.scad.parse(list,options),"utf8")
	}
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

Metaplex.convert = require("convert-units")

module.exports = Metaplex