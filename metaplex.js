var Metaplex = {
	solid:class {
		constructor() {
			this.transformStack = []
		}

		move(dx,dy,dz) {
			return this.translate(dx,dy,dz)
		}
		
		translate(dx,dy,dz) {
			this.transformStack.push("translate "+dx+" "+dy+" "+dz)
			
			return this
		}
		
		rotz(rz) {
			this.transformStack.push("rotz "+rz)
			return this
		}
		
		rotate(rx,ry,rz) {
			if (rx == 0 && ry == 0) {
				this.transformStack.push("rotz "+rz)
			} else {
				this.transformStack.push("rotate "+rx+" "+ry+" "+rz)
			}
			
			return this
		}
		
		scale(sx,sy,sz) {
			this.transformStack.push("scale "+sx+" "+sy+" "+sz)
			
			return this
		}
		
	}
}
	
Metaplex.group=class extends Metaplex.solid {
	constructor() {
		super();
		this.addlist = []
		this.sublist = []
		this.andlist = []
		this.headlist = []
	}
	
	add(ob) {
		this.addlist.push(ob.list())
	}
	
	sub(ob) {
		this.sublist.push(ob.list())
	}
	
	and(ob) {
		this.andlist.push(ob.list())
	}
	
	setFN(fn) {
		this.headlist.push("$fn "+fn)
	}
	
	list() {
		var addlist = Metaplex.joinLineList(this.addlist,"+ ")
		var andlist = Metaplex.joinLineList(this.andlist,"& ")
		var sublist = Metaplex.joinLineList(this.sublist,"- ")
		var joinedList = []
		if (addlist) joinedList.push(addlist);
		if (andlist) joinedList.push(andlist);
		if (sublist) joinedList.push(sublist)
		
		
		return (this.headlist.join("\n")+"\n"+Metaplex.listTransforms(this)+"{\n"+joinedList.join("\n")).replace(/^(\n+)/g,"").replace(/\n{2,}/g,"\n")+"\n}"
	}
}
	




Metaplex.primitives = {
	sphere:class extends Metaplex.solid{			
		constructor(radius) {
			super()
			this.radius = radius
			
		}
		
		list() {
			return Metaplex.listTransforms(this)+"sphere "+this.radius
		}
	}
	,cube:class extends Metaplex.solid{
		constructor(size) {
			super()
			this.size = size
		}
		
		list() {
			return Metaplex.listTransforms(this)+"cube "+this.size
		}
	}
	,cylinder:class extends Metaplex.solid{
		constructor(height,radius) {
			super()
			this.height = height
			this.radius = radius
		}
		
		list() {
			return Metaplex.listTransforms(this)+"cylinder "+this.height+" "+this.radius
		}
	}
	,cone:class extends Metaplex.solid {
		constructor(height,r1,r2) {
			super()
			this.height = height
			this.radius1 = r1
			if (!r2) {
				r2 = 0
			}
			this.radius2 = r2
		}
		
		list() {
			return Metaplex.listTransforms(this)+"cone "+this.height+" "+this.radius1+" "+this.radius2
		}		
	}
	,box:class extends Metaplex.solid {
		constructor(width,depth,height) {
			super()
			this.width = width
			this.depth = depth
			this.height = height
		}
		
		list() {
			return Metaplex.listTransforms(this)+"box "+this.width+" "+this.depth+" "+this.height			
		}
	}
	,wedge:class extends Metaplex.solid {
		constructor(height,radius,angle,center) {
			super();
			this.height = height
			this.radius = radius
			this.angle = angle
			this.center = center
			if (center) {
				this.rotz(-this.angle/2)
			}
		}
		
		list() {
			var out = []
			var group = new Metaplex.group();
			group.add(new Metaplex.primitives.cylinder(this.height,this.radius))
			if (this.angle <= 90) {
				if (this.angle < 90) {
					group.and(new Metaplex.primitives.cube(this.radius*1.02).rotz(this.angle-90).translate(0,0,-0.01))
				}				
				group.and(new Metaplex.primitives.cube(this.radius*1.02))
			} else if (this.angle <= 180) {
				group.sub(new Metaplex.primitives.cube(this.radius*2*1.02).translate(-this.radius*1.02,-this.radius*2*1.02,-0.01))
				if (this.angle < 180) {
					group.sub(new Metaplex.primitives.cube(this.radius*2*1.02).translate(-this.radius*1.02,0,-0.01).rotz(this.angle))
				}
			} else {
				throw "Error: Angles > 180 are currently not supported. Angle = "+this.angle
			}
			
			
			return Metaplex.listTransforms(this)+group.list();
			
		}
		
	}
	,torus:class extends Metaplex.solid {
		constructor(majorRadius,minorRadius) {
			super();
			this.majorRadius = majorRadius
			this.minorRadius = minorRadius
		}

		list() {
			return Metaplex.listTransforms(this)+"rotate_extrude 360 10 translate "+this.majorRadius+" 0 0 circle "+this.minorRadius
		}
	}
	,circle:class extends Metaplex.solid {
		constructor(radius) {
			super();
			this.radius = radius
		}
		
		list() {
			return Metaplex.listTransforms(this)+"circle "+this.radius
		}		
	}
	,polygon:class extends Metaplex.solid {
		constructor(points) {
			super();
			this.points = points
		}
		
		list() {
			return Metaplex.listTransforms(this)+"polygon "+JSON.stringify({points:this.points})
		}
		
	}
	,isoThreads:class extends Metaplex.solid {
		constructor(radius,pitch,length,options) {
			super()
			this.radius = radius
			this.pitch = pitch
			this.length = length
			this.options = options
		}
		
		
		list() {
			return Metaplex.listTransforms(this)+"threads_dk "+this.radius+" "+this.pitch+" "+this.length+" "+JSON.stringify(this.options)		
		}		
	}
	,threads:class extends Metaplex.solid {
		constructor(helixRadius,threadRadius,pitch,length,options) {
			super()
			this.helixRadius = helixRadius
			this.threadRadius = threadRadius
			this.options = options
			this.pitch = pitch
			this.length = length
		}
		
		list() {
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
			
			return Metaplex.listTransforms(this)+"{\n+ linear_extrude "+this.length+" "+10+" "+twist+" "+1+" polygon "+JSON.stringify({points:points})+"\n- "+startWedge1.list()+"\n- "+startWedge2.list()+"\n- "+endWedge1.list()+"\n- "+endWedge2.list()+"\n}"
		}		
	}
	

}

Metaplex.listTransforms = function(ob) {
	var out = ob.transformStack.reverse().join(" ")
	return out+(out.length != 0 ? " " : "")
}

Metaplex.joinLineList = function(lines,prefix) {
	if (lines.length) {
		return prefix + lines.join("\n"+prefix)
	} else {
		return ""
	}
}

module.exports = Metaplex