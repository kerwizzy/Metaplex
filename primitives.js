var Metaplex = require("./metaplex.js")

var primitives = {
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

primitives.rectangle = primitives.square
primitives.rect = primitives.square
primitives.cube = primitives.box

module.exports = primitives