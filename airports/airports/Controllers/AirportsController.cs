using Gremlin.Net.Driver;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace airports.Controllers
{
    [Produces("application/json")]
    [Route("api/Airports")]
    public class AirportsController : Controller
    {

        private string hostname = "HOST.gremlin.cosmos.azure.com";
        private int port = 443;
        private string authKey = "YOUR KEY";
        private string database = "DATABASE";
        private string collection = "COLLECTION";



        private GremlinServer gremlinServer;
        private GremlinClient gremlinClient;

        private void connect()
        {
            gremlinServer = new GremlinServer(hostname, port, enableSsl: true,
                                                            username: "/dbs/" + database + "/colls/" + collection,
                                                            password: authKey);


            gremlinClient = new GremlinClient(gremlinServer, new GraphSON2Reader(), new GraphSON2Writer(), "application/vnd.gremlin-v2.0+json");


        }

        // GET: api/Airports
        [HttpGet]
        public async Task<List<dynamic>> Get()
        {

            connect();
            string gremlinStr = "g.V().hasLabel('airport')";
            var results = await gremlinClient.SubmitAsync<dynamic>(gremlinStr);
            List<dynamic> airports = new List<dynamic>();
            foreach (var result in results)
            {
                airports.Add(result);
            }


            return airports;
        }


        //GET: api/Airports/5
        [HttpGet("{iata}", Name = "Get")]
        public async Task<dynamic> Get(string iata)
        {
            connect();
            string gremlinStr = String.Format("g.V().hasLabel('airport').has('iata','{0}')", iata);
            var airport = await gremlinClient.SubmitAsync<dynamic>(gremlinStr);
            return airport;
        }


        [HttpGet]
        [Route("destinations/{origin}")]
        public async Task<dynamic> GetDestinations(string origin)
        {
            connect();
            string gremlinStr = String.Format("g.V().has('iata','{0}').outE().inV()", origin);
            var results = await gremlinClient.SubmitAsync<dynamic>(gremlinStr);
            List<dynamic> airports = new List<dynamic>();
            foreach (var result in results)
            {
                airports.Add(result);
            }
            return airports;
        }


        [HttpGet]
        [Route("route/{origin}/{destination}")]
        public async Task<dynamic> GetRoute(string origin, string destination)
        {
            connect();
            string gremlinStr = String.Format("g.V().has('iata','{0}').repeat(out().simplePath()).until(has('iata','{1}')).path().limit(1)", origin, destination);
            var route = await gremlinClient.SubmitAsync<dynamic>(gremlinStr);
            return route;
        }



    }
}
