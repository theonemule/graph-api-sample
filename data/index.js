var endpoint = 'HOST.gremlin.cosmos.azure.com'
var user = '/dbs/DATABASE/colls/COLLECTION'
var passwd = '<<YOUR KEY>>'

var country = "Thailand"

var csv = require("fast-csv");
var fs = require("fs")
var Gremlin = require("gremlin");

var client = Gremlin.createClient(443, endpoint, { 
	session: true,
	ssl: true,
	user: user,
	password: passwd	
});

var edges = []
var readVertices = {}
var linkedVertices = {}
var edges = []


var getDistanceFromLatLonInKm = function(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

var deg2rad = function(deg) {
  return deg * (Math.PI/180)
}

var routesStream = csv()
    .on("data", function(data){
		if(data[3] > 0 && data[5] > 0){
			if (readVertices[data[3]] && 
			readVertices[data[5]] && 
			readVertices[data[3]].country == country &&
			readVertices[data[5]].country == country ){
				if (!(data[3] in linkedVertices)){
					linkedVertices[data[3]] = readVertices[data[3]]
				}
				if (!(data[5] in linkedVertices)){
					linkedVertices[data[5]] = readVertices[data[5]]
				}
				
				var edge = {
					airlineId: data[0],
					originId: data[3],
					destinationId: data[5],
					distance: getDistanceFromLatLonInKm(
						readVertices[data[3]].lat, 
						readVertices[data[3]].log, 
						readVertices[data[5]].lat,
						readVertices[data[5]].log						
					)
				}
				
				edges.push(edge)
			}
		}
    })
    .on("end", function(){
		console.log("Routes finished...");
		console.log("airports served: " + Object.keys(linkedVertices).length);	
		console.log("routes: " + edges.length);	
		
	

		var addAirportStr = "g.addV('airport').property('airportId', airportId).property('name', name).property('city', city).property('country', country).property('iata', iata).property('icao', icao).property('lat', lat).property('log', log)"
		var addRouteStr = "g.V().hasLabel('airport').has('airportId', originId).addE('fliesTo').property('airlineId',airlineId).property('distance',distance).to(g.V().hasLabel('airport').has('airportId', destinationId))"
		var indices = []
		
		for (var airportIdx in linkedVertices) {
			indices.push(airportIdx)		
		}
		
		var idx = 0;
		
		var createVertex = function(){
			var airportIdx = indices[idx]
			
			var fields = {
				airportId: airportIdx,
				name: linkedVertices[airportIdx].name,
				city: linkedVertices[airportIdx].city, 
				country: linkedVertices[airportIdx].country,
				iata: linkedVertices[airportIdx].iata,
				icao: linkedVertices[airportIdx].icao,
				lat: linkedVertices[airportIdx].lat,
				log: linkedVertices[airportIdx].log
			}			
			
			if (idx % 100 == 0){
				console.log((Math.round((idx *100) / indices.length)) + "% complete...")
			}
			
			client.execute(addAirportStr, fields , (err, results) => {

				idx++
				if (idx < indices.length){
					createVertex(idx)					
				}else{
					idx = 0;
					console.log("100% complete...")
					console.log("Writing edges.")
					createEdge(idx)
				}
			})
		}
		
		var createEdge = function(){
			var fields = {
				originId: edges[idx].originId,
				destinationId: edges[idx].destinationId,
				airlineId: edges[idx].airlineId,
				distance: edges[idx].distance
			}
			
			if (idx % 100 == 0){
				console.log((Math.round((idx *100) / edges.length)) + "% complete...")
			}

			client.execute(addRouteStr, fields , (err, results) => {
				
				idx++
				if (idx < edges.length){
					createEdge()					
				}else{
					console.log("100% complete...")
					console.log("Done.")
					process.exit(0)	
				}
			})			
			
		}
		
		console.log("Writing vertices.")
		createVertex(idx)

		
    });

var airportsStream = csv()
    .on("data", function(data){
	
		var vertex = {
			name: data[1],
			city: data[2], 
			country: data[3],
			iata: data[4],
			icao: data[5],
			lat: data[6],
			log: data[7],
		}
	
	readVertices[data[0]] = vertex;
	
    })
    .on("end", function(){
		console.log("Aiports finished...");
		console.log("Reading Routes...");
		var routesFileStream = fs.createReadStream("routes.dat");
		routesFileStream.pipe(routesStream);
    });
 
console.log("Reading Aiports...");
var airportsFileStream = fs.createReadStream("airports.dat");
airportsFileStream.pipe(airportsStream);