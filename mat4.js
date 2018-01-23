var glmat4 = require("gl-mat4")
var vec3 = require("./vec3.js")

class mat4 {
	constructor(arr) {
		if (arr instanceof mat4) {
			this.data = arr.data.slice(0)
		} else {
			if (!arr) {
				this.data = glmat4.create();
			} else {
				this.data = arr
			}
		}
	}
	
	clone() {
		return glmat4.clone(this.data)
	}
	
	multiply(mat) {
		var out = []
		glmat4.multiply(out,this.data,new mat4(mat).data)
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
		
		/*
		var outX = m[0]*x+m[4]*y+m[8]*z+m[12]*w
		var outY = m[1]*x+m[5]*y+m[9]*z+m[13]*w
		var outZ = m[2]*x+m[6]*y+m[10]*z+m[14]*w
		var outW = m[3]*x+m[7]*y+m[11]*z+m[15]*w
		*/
		var outX = matrixRowMultiply(m[0],x,m[4],y,m[8],z,m[12],w)
		var outY = matrixRowMultiply(m[1],x,m[5],y,m[9],z,m[13],w)
		var outZ = matrixRowMultiply(m[2],x,m[6],y,m[10],z,m[14],w)
		//var outW = matrixRowMultiply(m[3],x,m[7],y,m[11],z,m[15],w)
		
		if (mode == 0) {
			return new vec3(outX,outY,outZ)
		} else {
			return [outX,outY,outZ]
		}
	}
	
	pointTowards(eye,point) {
		var out = []
		eye = new vec3(eye).arr()
		point = new vec3(point).arr()
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
		var arr = new vec3(a,b,c).arr();
		var out = []
		glmat4.translate(out,this.data,arr)
		return new mat4(out)
	}
	
	scale(a,b,c) {
		var arr = new vec3(a,b,c).arr();
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

class NullNumber { //A special number class for properly taking care of vectors with null components during point transformation.
/*
BEHAVIOR

add
num,num -> num+num
null,0 -> null
null,non-zero -> null

mul
num,num -> num*num
null,0 -> 0
null,non-zero -> null

REASONS FOR THIS BEHAVIOR

Vector: (1 2 null)
w=1

Matrix:
1 0 0 0
0 1 1 5
0 0 1 0
0 0 0 1
(y translation +5)

On 3rd (z) row:

0*1+0*2+1*null+0*1

0+1*null

result should be null (null z output of translation), so 1*null must equal null and 0+null must equal null:
	null*nonzero = null
	null+zero = null

On 2nd (y) row:

0*1+1*2+1*null+5*1

2+5+1*null

7+null (null*nonzero = null)

result should be null so
	null+nonzero = null

	
On 1st (x) row:

1*1+0*2+0*null+0*1

1+0*null

result should be 1, so:
	0*null = 0


*/

	constructor(v) {
		this.value = v
		this.isNull = v === null
	}
	
	add(num) { //must be a NullNumber
		if (num.isNull || this.isNull) {
			return new NullNumber(null)
		} else {
			return new NullNumber(this.value+num.value)
		}
	}
	mul(num) { //must be a NullNumber
		if (isZero(num.value) || isZero(this.value)) {
			return new NullNumber(0)
		} else if (num.isNull || this.isNull) {
			return new NullNumber(null)
		} else {
			return new NullNumber(this.value*num.value)
		}
	}

}

const epsilon = 1e-15
function isZero(v) {
	return v !== null && Math.abs(v) < epsilon 
}

function matrixRowMultiply(mx,x,my,y,mz,z,mw,w) {
	mx = new NullNumber(mx)
	my = new NullNumber(my)
	mz = new NullNumber(mz)
	mw = new NullNumber(mw)
	x = new NullNumber(x)
	y = new NullNumber(y)
	z = new NullNumber(z)
	w = new NullNumber(w)
	
	//m[0]*x+m[4]*y+m[8]*z+m[12]*w
	
	return (mx.mul(x).add(my.mul(y)).add(mz.mul(z)).add(mw.mul(w))).value
}

module.exports = mat4