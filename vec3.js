class vec3 {
	constructor (a,b,c) {
		/*		
		new vec3(vec3) -> vec3
		new vec3([x,y,z]) -> vec3
		new vec3(x,y,z) -> vec3
		
		*/		
		var x
		var y
		var z
		/*
		if a value is undefined, it will be converted to zero
		if a value is null, it will be kept as null and all operations using that value will return null
		
		*/
		
		if (a instanceof vec3) {
			x = a.x
			y = a.y
			z = a.z
		} else if (typeof b != "undefined") {
			x = a
			y = b
			z = c
		} else { //array
			x = a[0]
			y = a[1]
			z = a[2]
		}	
		
		if (typeof x == "undefined") {x = 0}
		if (typeof y == "undefined") {y = 0}
		if (typeof z == "undefined") {z = 0}
		
		this.x = x
		this.y = y
		this.z = z
		
		this.updateMagnitude();
	}
	
	get nullMask() { //returns bit mask in zyx order (x LSB) with 0 for null, 1 otherwise
		var x = this.x !== null
		var y = this.y !== null
		var z = this.z !== null
		var out = x
		out |= y << 1
		out |= z << 2
		return out
	}
	
	set nullMask(mask) {
		var x = this.x
		var y = this.y
		var z = this.z
		if (!x) x = 0;
		if (!y) y = 0;
		if (!z) z = 0;
		x = (mask&1 ? x : null)
		y = (mask&2 ? y : null)
		z = (mask&4 ? z : null)
		this.x = x
		this.y = y
		this.z = z
	}
	
	setNullMask(mask) {
		var x = this.x
		var y = this.y
		var z = this.z
		if (!x) x = 0;
		if (!y) y = 0;
		if (!z) z = 0;
		x = (mask&1 ? x : null)
		y = (mask&2 ? y : null)
		z = (mask&4 ? z : null)
		return new vec3(x,y,z)
	}
	
	fill() {
		return this.setNullMask(7)
	}
	
	clone() { //Returns a new vec3 with exactly the same parameters as this one
		return new vec3(this.x,this.y,this.z)
	}
	
	updateMagnitude() {
		var x = this.x
		var y = this.y
		var z = this.z //These may be null, but because of how null works, running the operation below should produce the proper result. (null*null = 0)
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
		
		return new vec3(x,y,z)	
	}
	
	scale(factor) { //Multiply all the components of a vector by a constant
		var m = this.nullMask
	
		var x = this.x
		var y = this.y
		var z = this.z

		x*=factor
		y*=factor
		z*=factor
		
		return new vec3(x,y,z).setNullMask(m)
	}
	
	add(vector) { //Add each component of another vector to that component of this vector (add x1 + x2, y1 + y2, etc)
		var m1 = this.nullMask
		var m2 = vector.nullMask
		
		var x = this.x
		var y = this.y
		var z = this.z
	
		x += vector.x
		y += vector.y
		z += vector.z
		
		return new vec3(x,y,z).setNullMask(m1&m2)
	}
	
	subtract(vector) {
		var m1 = this.nullMask
		var m2 = vector.nullMask
		
		var x = this.x
		var y = this.y
		var z = this.z
	
		x -= vector.x
		y -= vector.y
		z -= vector.z
		
		return new vec3(x,y,z).setNullMask(m1&m2)
	}
	
	multiply(vector) {
		var m1 = this.nullMask
		var m2 = vector.nullMask
		
		var x = this.x
		var y = this.y
		var z = this.z
	
		x *= vector.x
		y *= vector.y
		z *= vector.z
		
		return new vec3(x,y,z).setNullMask(m1&m2)
	}
	
	divide(vector) {
		var m1 = this.nullMask
		var m2 = vector.nullMask
		
		var x = this.x
		var y = this.y
		var z = this.z
	
		x /= vector.x
		y /= vector.y
		z /= vector.z
		
		return new vec3(x,y,z).setNullMask(m1&m2)
	}
	
	
	constantDivideBy(constant) { //Divide a constant by this vector
		var m = this.nullMask
	
		var x = this.x
		var y = this.y
		var z = this.z
	
		x = constant/x
		y = constant/y
		z = constant/z
		
		return new vec3(x,y,z).setNullMask(m)		
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
	
	get xy() {
		return new vec3(this.x,this.y,null)
	}
	
	get yz() {
		return new vec3(null,this.y,this.z)
	}
	
	get xz() {
		return new vec3(this.x,null,this.z)
	}
	
	get xyz() {
		return this.clone()
	}
}

module.exports = vec3