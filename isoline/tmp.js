console.log(data);
				
				var pressure= _.filter(data, function(o){
					return o.indicatorType=="PRESSURE";
				});
				
				console.log(pressure);
				
				var points={
					"features": new Array(),
					"type": "FeatureCollection"
				};

				_.forEach(pressure, function(val){
					if(typeof val.ScadaObject != "undefined" && val.object.objectProperty){
							var feature={
								"geometry": {
									"corrdinates": [val.object.objectProperty.x, val.object.objectProperty.y],
									"type": "Point",
								},
								"properties": {
									"z": parseFloat(val.ScadaObject.Value)
								},
								"type": "Feature"
							};
							points.features.push(feature);		
					}else{
						console.log(val);
					}
				});
				
				
				var breaks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
				var isolined = turf.isolines(points, 'z', 15, breaks);
				console.log(points);
				
				
				
				
				
				
				
				
				
				
				
				
				
				
								var points = turf.random('point', 100, {
				  bbox: [0, 30, 20, 50]
				});
				for (var i = 0; i < points.features.length; i++) {
				  points.features[i].properties.z = Math.random() * 10;
				}
				var d= _.orderBy(points.features, ['properties.z'], ['asc']);
				points.features=d;
				
				var breaks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
				var isolined = turf.isolines(points, 'z', 15, breaks);