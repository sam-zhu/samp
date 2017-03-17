$(function() {
    var interval;
    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth - 80;
    canvas.height = window.innerHeight - 80;
    canvas.style = "border:1px solid red;";
    var panel = document.getElementById('panel_draw');
    panel.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var data = null;
    var interval = 0.15

    var scale_geo = 1 / 10000;
    var offset_geo = {
        "x": null,
        "y": null
    };
    if ($('#geo_scale').val()) {
        scale_geo = parseFloat($('#geo_scale').val());
    }
    ctx.translate(0, canvas.height);
    ctx.scale(scale_geo, -scale_geo);

    var screen_coor = $('#screen_coor');
    var geo_coor = $('#geo_coor');
    var geo_coor1 = $('#geo_coor1');

    var geo_offset = $('#geo_offset');

    // ctx.beginPath();
    // ctx.fillStyle= "yellow"
    // ctx.fillRect(0,0, 25000, 10000);

    //    ctx.fillRect(25000,10000, 25000, 10000);
    // //ctx.arc(0,0,50000,0,Math.PI*2,true);
    // ctx.fill();
    //ctx.stroke();

    var points = null;

    $("#btn").click(function() {
        $.getJSON("indicator.json", function(data) {

            var pressure = _.filter(data, function(o) {
                return o.indicatorType == "PRESSURE";
            });

            console.log(pressure);

            points = {
                "features": new Array(),
                "type": "FeatureCollection"
            };

            var coors = [];

            _.forEach(pressure, function(val) {
                if (typeof val.ScadaObject != "undefined" && val.object.objectProperty) {
                    if (_.findIndex(coors, function(o) {
                            return o.x == val.object.objectProperty.x && o.y == val.object.objectProperty.y;
                        }) == -1) {
                        if (val.object.objectProperty.x > 0 && val.object.objectProperty.y > 0 && val.ScadaObject.Value) {

                            var feature = {
                                "geometry": {
                                    "coordinates": [val.object.objectProperty.x, val.object.objectProperty.y],
                                    "type": "Point",
                                },
                                "properties": {
                                    "z": parseFloat(val.ScadaObject.Value)
                                },
                                "type": "Feature"
                            };
                            points.features.push(feature);
                            coors.push({
                                "x": val.object.objectProperty.x,
                                "y": val.object.objectProperty.y
                            });
                        }

                    }

                } else {
                    console.log(val);
                }
            });


            var breaks = [0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];

            // var isolined = turf.isolines(points, 'z', 100, breaks);

            var pressPoint = new PressurePoint(points);
            pressPoint.getRange();
            pressPoint.scaleScreen();
            pressPoint.draw();
            pressPoint.isoline();
        })
    });

    $("#btnTest").click(function() {

        var _points = turf.random('point', 10, {
            bbox: [0, 0, 600, 600]
        });
        for (var i = 0; i < _points.features.length; i++) {
            _points.features[i].properties.z = Math.random() * 10;
        }
        var breaks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];




        var isolined = turf.isolines(_points, 'z', 10, breaks);
        var tin = turf.tin(_points, 10);
        //draw(isolined);
             var pressPoint = new PressurePoint(_points);
            //pressPoint.scaleScreen();
            pressPoint.draw();
            pressPoint.isoline(tin, isolined);
    });

    function draw(isolined) {


        var min_x=Infinity, min_y=Infinity,
        max_x=-Infinity, max_y=-Infinity;
        _.forEach(isolined.features, function(val){
        		_.forEach(val.geometry.coordinates, function(coor){
        			if(coor[0] > max_x) max_x=coor[0];
        			if(coor[0] < min_x) min_x=coor[0];

        			if(coor[1] > max_y) max_y=coor[1];
        			if(coor[1] < min_y) min_y=coor[1];
        		});
        })

        var x0=Math.floor(min_x);

        var y0=Math.floor(min_y);

        var scale_x=canvas.width/(max_x-min_x);
        var scale_y=canvas.height /(max_y-min_y);

        var s1=max_x / max_y;
        var s2=canvas.width / canvas.height;

        var scale= scale_x<scale_y ? scale_x : scale_y;

        clearCanvas();
        _.forEach(isolined.features, function(val) {
            
            var len = val.geometry.coordinates.length;
            var coors = val.geometry.coordinates;
            if (len > 0) {
                // ctx.moveTo((coors[0][0]-x0)*scale+20, (coors[0][1]-y0)*scale);
                // for(var l=1; l<len; l++){
                // ctx.lineTo((coors[l][0]-x0)*scale+20, (coors[l][1]-y0)*scale);
                // }	
                ctx.beginPath();
                ctx.moveTo((coors[0][0]-x0)*scale, (coors[0][1]-y0)*scale);
                for (var l = 1; l < len; l++) {
                    ctx.lineTo((coors[l][0]-x0)*scale, (coors[l][1]-y0)*scale);
                }
                 //ctx.closePath();
            }
            ctx.stroke();
           
        })
        console.log("ok");
    }

    function drawPoints(pts) {

        clearCanvas();
        ctx.setTransform(scale_geo, 0, 0, -scale_geo, offset_geo.x * scale_geo, canvas.height - offset_geo.y * scale_geo)
        ctx.fillStyle = "#FF0000";

        //ctx.moveTo(pts.features[0].geometry.coordinates[0], pts.features[0].geometry.coordinates[1]);
        _.forEach(pts.features, function(val) {
            if (val.geometry.coordinates[0] > 0 && val.geometry.coordinates[0] < canvas.width &&
                val.geometry.coordinates[1] > 0 && val.geometry.coordinates[1] < canvas.height) {
                console.log(val.geometry.coordinates);
            }
            ctx.beginPath();
            ctx.arc(val.geometry.coordinates[0], val.geometry.coordinates[1], 10 / scale_geo, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
        });

    }

    function drawDemo() {

        clearCanvas();
        ctx.beginPath();
        ctx.fillStyle = "blue"
        ctx.fillRect(0, 0, 25000, 10000);

        ctx.fillRect(25000, 10000, 25000, 10000);
        //ctx.arc(0,0,50000,0,Math.PI*2,true);
        ctx.fill();

    }

    function clearCanvas() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    var mouseX = null,
        mouseY = null;
    var coor_geo = {
        "x": null,
        "y": null
    };

    $(canvas).mousedown(function(e) {
        mouseX = e.pageX - this.offsetLeft;
        mouseY = e.pageY - this.offsetTop;

        coor_geo.x = mouseX / scale_geo - offset_geo.x;
        coor_geo.y = (mouseY - canvas.height) / scale_geo * (-1) - offset_geo.y;

        screen_coor.val(mouseX + "," + mouseY);
        geo_coor1.val(coor_geo.x + "," + coor_geo.y);
    });

    $(canvas).mousemove(function(e) {
        mouseX = e.pageX - this.offsetLeft;
        mouseY = e.pageY - this.offsetTop;

        coor_geo.x = mouseX / scale_geo - offset_geo.x;
        coor_geo.y = (mouseY - canvas.height) / scale_geo * (-1) - offset_geo.y;

        screen_coor.val(mouseX + "," + mouseY);
        geo_coor.val(coor_geo.x + "," + coor_geo.y);
    });

    $(geo_update).click(function() {
        if ($('#geo_scale').val()) {
            scale_geo = parseFloat($('#geo_scale').val());
        }
        var offset = $(geo_offset).val().split(',');
        offset_geo.x = parseFloat(offset[0]);
        offset_geo.y = parseFloat(offset[1]);

        //drawDemo();
        drawPoints(points);
    });


    var PressurePoint = function(points) {

        this.points = points;
        this.getRange = function() {

            var min_x = 499655,
                min_y = 3092355,
                max_x = 507175,
                max_y = 3101515;
            points.features = _.filter(points.features, function(val) {
                return val.geometry.coordinates[0] >= min_x && val.geometry.coordinates[0] <= max_x &&
                    val.geometry.coordinates[1] >= min_y && val.geometry.coordinates[1] <= max_y;
            });

        }
        this.scaleScreen = function(){

        	    var min_x = Infinity,
                min_y = Infinity,
                max_x = -Infinity,
                max_y = -Infinity;
	        _.forEach(points.features, function(val){
	        			if(val.geometry.coordinates[0] > max_x) max_x=val.geometry.coordinates[0];
	        			if(val.geometry.coordinates[0] < min_x) min_x=val.geometry.coordinates[0];

	        			if(val.geometry.coordinates[1] > max_y) max_y=val.geometry.coordinates[1];
	        			if(val.geometry.coordinates[1] < min_y) min_y=val.geometry.coordinates[1];
	        });
            var x0 = Math.floor(min_x);
            var y0 = Math.floor(min_y);
            var scale_x = canvas.width / (max_x - min_x);
            var scale_y = canvas.height / (max_y - min_y);

            var s1 = max_x / max_y;
            var s2 = canvas.width / canvas.height;

            var scale = scale_x < scale_y ? scale_x : scale_y;
            //scale =scale*10;

            //x0=1095285.575;
            //y0=1142320;


            _.forEach(points.features, function(val) {

                val.geometry.coordinates[0] = (val.geometry.coordinates[0] - x0) * scale;
                val.geometry.coordinates[1] = (val.geometry.coordinates[1] - y0) * scale;
            });
        }

        this.draw = function() {
            clearCanvas();

            _.forEach(points.features, function(val) {
                if (val.geometry.coordinates[0] > 0 && val.geometry.coordinates[0] < canvas.width &&
                    val.geometry.coordinates[1] > 0 && val.geometry.coordinates[1] < canvas.height) {
                    console.log(val.geometry.coordinates);
                }
                ctx.beginPath();
                ctx.arc(val.geometry.coordinates[0], val.geometry.coordinates[1], 5, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fill();
            });
        }

        this.isoline=function(isolined, line){
        	 // var breaks = [0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];

          //    var isolined = turf.isolines(points, 'z', 100, breaks);
  			//clearCanvas();
	        _.forEach(isolined.features, function(val) {
	         
	            var coors = val.geometry.coordinates;
	             _.forEach(coors, function(m) {
	             	   var len = m.length;
	             	    if (len > 0) {
	            	//ctx.beginPath();
	            	ctx.moveTo((m[0][0]), (m[0][1]));
	                for (var l = 1; l < len; l++) {

		                ctx.lineTo(m[l][0], m[l][1]);

	                }
	               // ctx.closePath();
	                  ctx.stroke();
	            }
	             });

	            // if (len > 0) {
	            // 	//ctx.beginPath();
	            // 	ctx.moveTo((coors[0][0]), (coors[0][1]));
	            //     for (var l = 1; l < len; l++) {

		           //      ctx.lineTo(coors[l][0], coors[l][1]);

	            //     }
	            //    // ctx.closePath();
	            //       ctx.stroke();
	            // }
	          
	        _.forEach(line.features, function(val) {
	         
	            var len = val.geometry.coordinates.length;
	            var coors = val.geometry.coordinates;
	             	    if (len > 0) {
	            	//ctx.beginPath();
	            	ctx.moveTo((coors[0][0]), (coors[0][1]));
	                for (var l = 1; l < len; l++) {

		                ctx.lineTo(coors[l][0], coors[l][1]);

	               // ctx.closePath();
	                  ctx.stroke();
	              }}
	              

	             });
	        })

        }
    }
});