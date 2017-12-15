'use strict'

var container = document.getElementById( 'container' );

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, .1, 1000 );
camera.position.set( 0, 0, -10 );

var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
container.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );
var clock = new THREE.Clock();

var lines = [];
var meshLines = [];
var geos = [];
var resolution = new THREE.Vector2( window.innerWidth, window.innerHeight );
var strokeTexture;

var Params = function() {
	this.curves = true;
	this.circles = false;
	this.amount = 10;
	this.lineWidth = 10;
	// this.taper = 'parabolic';
	this.strokes = false;
	// this.sizeAttenuation = false;
	this.animateGeometory = true;
	this.animateWidth = false;
	this.animateWidthAmount = 10;
	this.animateWidthSpeed = 10;
	this.spread = false;
	this.autoRotate = false;
	this.autoUpdate = true;
    this.animateVisibility=false;
	this.update = function() {
		clearLines();
		createLines();
	}
};

var params = new Params();
var gui = new dat.GUI();

window.addEventListener( 'load', function() {

	function update() {
		if( params.autoUpdate ) {
			clearLines();
			createLines();
		}
	}

	gui.add( params, 'curves' ).onChange( update );
	gui.add( params, 'circles' ).onChange( update );
	gui.add( params, 'amount', 1, 100 ).onChange( update );
	// gui.add( params, 'lineWidth', 1, 20 ).onChange( update );
	// gui.add( params, 'taper', [ 'none', 'linear', 'parabolic', 'wavy' ] ).onChange( update );
	gui.add( params, 'strokes' ).onChange( update );
	// gui.add( params, 'sizeAttenuation' ).onChange( update );
	gui.add( params, 'autoUpdate' ).onChange( update );
	gui.add( params, 'autoRotate' );
	gui.add( params, 'spread' ).onChange( update );
	gui.add( params, 'update' );

	var guiUG = gui.addFolder('updateGeometory')
	guiUG.add( params, 'animateGeometory' );
	guiUG.add( params, 'animateWidth' );
	guiUG.add( params, 'animateWidthAmount', 1, 100 );
	guiUG.add( params, 'animateWidthSpeed', 1, 100 );
	guiUG.open()

	var guiVSE = gui.addFolder('visibilityStart/End')
	guiVSE.add( params, 'animateVisibility' );
	guiVSE.open()

	var loader = new THREE.TextureLoader();
	loader.load( 'assets/stroke.png', function( texture ) {
		strokeTexture = texture;
		init()
	} );

} );

var TAU = 2 * Math.PI;
var hexagonGeometry = new THREE.Geometry();
for( var j = 0; j < TAU - .1; j += TAU / 100 ) {
	var v = new THREE.Vector3();
	v.set( Math.cos( j ), Math.sin( j ), 0 );
	hexagonGeometry.vertices.push( v );
}
hexagonGeometry.vertices.push( hexagonGeometry.vertices[ 0 ].clone() );

function createCurve() {

	var s = new THREE.ConstantSpline();
	var rMin = 5;
	var rMax = 10;
	var origin = new THREE.Vector3( Maf.randomInRange( -rMin, rMin ), Maf.randomInRange( -rMin, rMin ), Maf.randomInRange( -rMin, rMin ) );

	s.inc = .001;
	s.p0 = new THREE.Vector3( .5 - Math.random(), .5 - Math.random(), .5 - Math.random() );
	s.p0.set( 0, 0, 0 );
	s.p1 = s.p0.clone().add( new THREE.Vector3( .5 - Math.random(), .5 - Math.random(), .5 - Math.random() ) );
	s.p2 = s.p1.clone().add( new THREE.Vector3( .5 - Math.random(), .5 - Math.random(), .5 - Math.random() ) );
	s.p3 = s.p2.clone().add( new THREE.Vector3( .5 - Math.random(), .5 - Math.random(), .5 - Math.random() ) );
	s.p0.multiplyScalar( rMin + Math.random() * rMax );
	s.p1.multiplyScalar( rMin + Math.random() * rMax );
	s.p2.multiplyScalar( rMin + Math.random() * rMax );
	s.p3.multiplyScalar( rMin + Math.random() * rMax );

	s.calculate();
	var geometry = new THREE.Geometry();
	s.calculateDistances();
	//s.reticulate( { distancePerStep: .1 });
	s.reticulate( { steps: 500 } );
 	var geometry = new THREE.Geometry();

	for( var j = 0; j < s.lPoints.length; j++ ) {
		geometry.vertices.push( s.lPoints[ s.lPoints.length - j - 1 ].clone() );
	}

	return geometry;

}

var colors = [
	0xed6a5a,
	0xf4f1bb,
	0x9bc1bc,
	0x5ca4a9,
	0xe6ebe0,
	0xf0b67f,
	0xfe5f55,
	0xd6d1b1,
	0xc7efcf,
	0xeef5db,
	0x50514f,
	0xf25f5c,
	0xffe066,
	0x247ba0,
	0x70c1b3
];

function clearLines() {

	lines.forEach( function( l ) {
		scene.remove( l );
	} );
	lines = [];

	meshLines = [];
	geos = [];
}

function makeLine( geo ) {

	var g = new MeshLine();

	g.setGeometry(geo, function(p){ return Maf.parabola( p, 1 ) });

	var material = new MeshLineMaterial( {
		map: strokeTexture,
		useMap: params.strokes,
		color: new THREE.Color( colors[ ~~Maf.randomInRange( 0, colors.length ) ] ),
		opacity: 1,//params.strokes ? .5 : 1,
		dashArray: new THREE.Vector2( 10, 5 ),
		resolution: resolution,
		sizeAttenuation: 0,
		lineWidth: params.lineWidth,
		near: camera.near,
		far: camera.far,
		depthWrite: false,
		depthTest: !params.strokes,
		alphaTest: params.strokes ? .5 : 0,
		transparent: true,
		side: THREE.DoubleSide
	});
	var mesh = new THREE.Mesh( g.geometry, material );
	if( params.spread || params.circles ) {
		var r = 50;
		mesh.position.set( Maf.randomInRange( -r, r ), Maf.randomInRange( -r, r ), Maf.randomInRange( -r, r ) );
		var s = 10 + 10 * Math.random();
		mesh.scale.set( s,s,s );
		mesh.rotation.set( Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI );
	}
	scene.add( mesh );

	lines.push( mesh );

	meshLines.push( g );
	geos.push( geo.clone() );
}

function init() {

	createLines();
	onWindowResize();
	render();

}

function createLine() {
	if( params.circles ) makeLine( hexagonGeometry );
	if( params.curves ) makeLine( createCurve() );
	// makeLine( makeVerticalLine() );
	// makeLine( makeSquare() );
}

function createLines() {
	for( var j = 0; j < params.amount; j++ ) {
		createLine();
	}
}

function makeVerticalLine() {
	var g = new THREE.Geometry()
	var x = ( .5 - Math.random() ) * 100;
	g.vertices.push( new THREE.Vector3( x, -10, 0 ) );
	g.vertices.push( new THREE.Vector3( x, 10, 0 ) );
	return g;
}

function makeSquare() {
	var g = new THREE.Geometry()
	var x = ( .5 - Math.random() ) * 100;
	g.vertices.push( new THREE.Vector3( -1, -1, 0 ) );
	g.vertices.push( new THREE.Vector3( 1, -1, 0 ) );
	g.vertices.push( new THREE.Vector3( 1, 1, 0 ) );
	g.vertices.push( new THREE.Vector3( -1, 1, 0 ) );
	g.vertices.push( new THREE.Vector3( -1, -1, 0 ) );
	return g;
}

function onWindowResize() {

	var w = container.clientWidth;
	var h = container.clientHeight;

	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );

	resolution.set( w, h );

}

window.addEventListener( 'resize', onWindowResize );

var tmpVector = new THREE.Vector3();

function render(time) {

	requestAnimationFrame( render );
	controls.update();

	var delta = clock.getDelta();
	var t = clock.getElapsedTime();

	if(params.autoRotate) scene.rotation.y += .125 * delta;

	lines.forEach( function( l, i ) {
		l.material.uniforms.visibilityEnd.value= params.animateVisibility ? Math.sin((time/5000 + Math.PI * 0.5 + i) % (Math.PI * 0.5)) * 2 : 1.0;
		l.material.uniforms.visibilityStart.value= params.animateVisibility ? Math.sin((time/5000 + i) % (Math.PI * 0.5)) * 2 - 1 : 0.0;

		var a = null
		if(params.animateGeometory) {
			a = []
			for(var j = 0; j < geos[i].vertices.length; j++) {
				var x = (Math.sin(t * 0.5 + i + j * 0.01) + 2) * 0.5
				var y = (Math.cos(t * 0.5 + i + j * 0.01) + 2) * 0.5
				var z = (Math.cos(t * 0.5 - i - j * 0.01) + 2) * 0.5
				a.push(geos[i].vertices[j].x * x)
				a.push(geos[i].vertices[j].y * y)
				a.push(geos[i].vertices[j].z * z)
			}
		}

		var f = null;
		if(params.animateWidth) f = function(p){ return Maf.parabola( p, 1 ) * (Math.sin(time * 0.001 * params.animateWidthSpeed + p * Math.PI * params.animateWidthAmount) + 2 + i) * 0.5 }
		
		meshLines[i].updateGeometry(a, f)
	} );

	renderer.render( scene, camera );

}
