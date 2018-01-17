var glmat4 = require("gl-mat4")
var vec3 = require("./vec3.js")

class mat4 {
	constructor(arr) {
		if (!arr) {
			this.data = glmat4.create();
		} else {
			this.data = arr
		}
	}
	
	static getMatrix(a) {
		if (a instanceof mat4) {
			return a
		} else {
			return new mat4(a)
		}
	}
	
	clone() {
		return glmat4.clone(this.data)
	}
	
	multiply(mat) {
		var out = []
		glmat4.multiply(out,this.data,mat4.getMatrix(mat).data)
		return new mat4(out)
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
		if (a instanceof vec3) {
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
			return new vec3(outX,outY,outZ)
		} else {
			return [outX,outY,outZ]
		}
	}
	
	pointTowards(eye,point) {
		var out = []
		eye = vec3.getVector(eye).arr()
		point = vec3.getVector(point).arr()
		var up = [0,0,1]
		glmat4.lookAt(out,eye,point,up)
		var inverted = new mat4(out).invert()
		return this.multiply(inverted.scale(-1,-1,-1))
	}
	
	invert() {
		var out = []
		glmat4.invert(out,this.clone())
		return new mat4(out)
	}
	
	translate(a,b,c) {
		var arr = vec3.getVector(a,b,c).arr();
		var out = []
		glmat4.translate(out,this.data,arr)
		return new mat4(out)
	}
	
	scale(a,b,c) {
		var arr = vec3.getVector(a,b,c).arr();
		var out = []
		glmat4.scale(out,this.data,arr)
		return new mat4(out)
	}
	
	rotateX(angle) {
		var out = []
		glmat4.rotateX(out,this.data,angle)
		return new mat4(out)
	}
	
	rotateY(angle) {
		var out = []
		glmat4.rotateY(out,this.data,angle)
		return new mat4(out)
	}
	
	rotateZ(angle) {
		var out = []
		glmat4.rotateZ(out,this.data,angle)
		return new mat4(out)
	}
	
	rotateMultiple(x,y,z) {
		return this.rotateX(x).rotateY(y).rotateZ(z)
	}
	
	invert() {
		var out = []
		glmat4.invert(out,this.data)
		return new mat4(out)
	}
	
	arr() {
		return [this.data.slice(0,4),this.data.slice(4,8),this.data.slice(8,12),this.data.slice(12,16)]
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

module.exports = mat4