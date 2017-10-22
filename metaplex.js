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
			out.push("cylinder "+this.height+" "+this.radius)
			if (this.angle <= 90) {
				if (this.angle < 90) {
					out.push("& translate 0 0 -0.01 rotz "+(this.angle-90)+" cube "+(this.radius*1.02))
				}				
				out.push("& cube "+this.radius*1.02)
			} else {
				throw "Error: Angles > 90 are currently not supported. Angle = "+this.angle
			}
			
			
			return Metaplex.listTransforms(this)+"{\n"+out.join("\n")+"\n}"
			
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