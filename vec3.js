class vec3 {
	/**

	A class to represent vectors and points in general. Used many places in Metaplex.

	Note that components CAN be null.
	@property {number} x - x value
	@property {number} y - y value
	@property {number} z - z value
	@property {number} magnitude - magnitude of this vector

	@todo Improve documentation for vectors with null components

	@example
	//these are all the same.
	var vector1 = new Metaplex.vec3(1,2,3)
	var vector2 = new Metaplex.vec3([1,2,3])
	var vector3 = new Metaplex.vec3(vector1)

	@constructor
	*/
	
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
	
	/**
	The "nullMask" for this vector, a bit mask in zyx order (x LSB) with 0 for null, 1 otherwise. 
	
	Setting to this will change the null mask. For bits that are different from the current nullMask, values previously null will be set to zero, and values currently non-null will be set to null, and the old values will not be recoverable.
	
	@returns {vec3}
	*/
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
		this.updateMagnitude()
	}
	
	/**
	Equivalent to assigning a value to [vec3.nullMask]{@link vec3#nullMask}, except it makes a new vector and is chainable.
	
	@returns {vec3}
	*/
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
	
	/**
	Equivalent to `vec3.setNullMask(7)`. Sets all null values to 0 and leaves all other values the same.
	
	@returns {vec3}
	*/
	fill() {
		return this.setNullMask(7)
	}
	
	/**
	## vec3.clone
	
	Returns a copy of this vector.
	
	@returns {vec3}
	*/
	clone() {
		return new vec3(this.x,this.y,this.z)
	}
	
	/**
	Updates the magnitude of this vector. Called automatically by most functions that change it, and also when creating a new vector. Usually only needs to be called when manually changing components of a vector.
	*/
	updateMagnitude() {
		var x = this.x
		var y = this.y
		var z = this.z //These may be null, but because of how null works, running the operation below should produce the proper result. (null*null = 0)
		this.magnitude = Math.sqrt(x*x+y*y+z*z)
	}
	
	/**
	Returns a new vector, scaled so that its magnitude is 1. (The point is on the unit sphere)
	
	@returns {vec3}
	*/
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
	
	equals(a,b,c) {
		var vector = new vec3(a,b,c)
		return vector.x === this.x && vector.y === this.y && vector.z === this.z
	}
	
	/**
	Multiply all the components of a vector by a constant. Returns a new vector.
	
	@param {number} factor - the factor to scale by
	@returns {vec3}
	*/
	scale(factor) { 
		var m = this.nullMask
	
		var x = this.x
		var y = this.y
		var z = this.z

		x*=factor
		y*=factor
		z*=factor
		
		return new vec3(x,y,z).setNullMask(m)
	}
	
	/**
	Returns a new vector equal to this vector + another
	
	@param {vec3} vector - the vector to add	
	@returns {vec3}
	*/
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
	
	/**
	Returns a new vector equal to this vector - another
	
	@param {vec3} vector - the vector to subtract	
	@returns {vec3}
	*/	
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
	
	/**
	Returns a new vector equal to this vector * another
	
	@param {vec3} vector - the vector to multiply by
	@returns {vec3}
	*/
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
	
	/**
	Returns a new vector equal to this vector / another
	
	@param {vec3} vector - the vector to divide by
	@returns {vec3}
	*/	
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
	
	
	/**
	Returns a new vector equal to `constant` / this vector
	
	@param {vec3} constant
	@returns {vec3}
	*/
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
	
	/**
	Returns the dot product between this vector and another
	
	@param {vec3} vector
	@returns {number}
	*/
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
	
	/**
	Returns a new vector equal to this vector reflected off a plane specified by `normal`
	
	@param {vec3} normal
	@returns {vec3}
	*/	
	reflect(normal) {
		return this.subtract(normal.scale(this.dotProduct(normal)*2))
	}
	
	/**
	Returns a string representation of this vector in the format "(x,y,z)"
	
	@returns {string}
	*/
	toString() {
		return "("+this.x+","+this.y+","+this.z+")"
	}
	
	/**
	Returns an array representation of this vector in the format [x,y,z]
	
	@returns {Array}
	*/
	arr() {
		return [this.x,this.y,this.z]
	}	
	
	/**
	Returns a new vector, with only the x and y components of this vector and null z
	
	@returns {vec3}
	*/
	get xy() {
		return new vec3(this.x,this.y,null)
	}
	
	/**
	Returns a new vector, with only the y and z components of this vector and null x
	
	@returns {vec3}
	*/
	get yz() {
		return new vec3(null,this.y,this.z)
	}
	
	/**
	Returns a new vector, with only the x and z components of this vector and null y
	
	@returns {vec3}
	*/
	get xz() {
		return new vec3(this.x,null,this.z)
	}
	
	/**
	Equivalent to [vec3.clone]{@link vec3#clone}
	*/
	get xyz() {
		return this.clone()
	}
}

module.exports = vec3