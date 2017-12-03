# Metaplex
A Javascript CAD modelling wrapper

Metaplex allows using other programmatic CAD modellers through a Javascript API which exports designs in a general JSON format which can be converted to the format required by a specific CAD modeller. 
Metaplex is currently in the pre-alpha, experimental stage, and is not recommended for actual use. However, if you really want to try it out, here's how:

1. Clone this git repository
2. Run `npm install` to install all dependencies.
3. Run `metaplex-watch.js <design file.js>` to start CAD modelling.

# Examples

Create a simple cube with sphere:

```javascript
var Metaplex = require("metaplex.js")
var p = Metaplex.primitives //Metaplex.primitives is used so often it is useful to create a variable to refer to it

var cube = new p.cube(2)
cube.sub(new p.sphere(1))

cube.save("cube.scad")
```