class vec3 {
	constructor (x,y,z) {
		if (!x) {x = 0}
		if (!y) {y = 0}
		if (!z) {z = 0}
		
		this.x = x
		this.y = y
		this.z = z
		
		this.updateMagnitude();
	}
	
	static getVector(a,b,c) {
		/*		
		getVector(vec3) -> vec3
		getVector([x,y,z]) -> vec3
		getVector(x,y,z) -> vec3
		
		*/		
		var x
		var y
		var z
		
		if (a instanceof vec3) {
			x = a.x
			y = a.y
			z = a.z;
		} else if (typeof b != "undefined") {
			x = a
			y = b
			z = c
		} else { //array
			x = a[0]
			y = a[1]
			z = a[2]
		}
		return new vec3(x,y,z)
		
	}
	
	duplicate() { //Returns a new vec3 with exactly the same parameters as this one
		return new vec3(this.x,this.y,this.z)
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
		
		return new vec3(x,y,z)	
	}
	
	scale(factor) { //Multiply all the components of a vector by a constant
		var x = this.x
		var y = this.y
		var z = this.z

		x*=factor
		y*=factor
		z*=factor
		
		return new vec3(x,y,z)
	}
	
	add(vector) { //Add each component of another vector to that component of this vector (add x1 + x2, y1 + y2, etc)
		var x = this.x
		var y = this.y
		var z = this.z
	
		x += vector.x
		y += vector.y
		z += vector.z
		
		return new vec3(x,y,z)
	}
	
	subtract(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x -= vector.x
		y -= vector.y
		z -= vector.z
		
		return new vec3(x,y,z)		
	}
	
	multiply(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x *= vector.x
		y *= vector.y
		z *= vector.z
		
		return new vec3(x,y,z)		
	}
	
	divide(vector) {
		var x = this.x
		var y = this.y
		var z = this.z
	
		x /= vector.x
		y /= vector.y
		z /= vector.z
		
		return new vec3(x,y,z)		
	}
	
	
	constantDivideBy(constant) { //Divide a constant by this vector
		var x = this.x
		var y = this.y
		var z = this.z
	
		x = constant/x
		y = constant/y
		z = constant/z
		
		return new vec3(x,y,z)		
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

module.exports = vec3