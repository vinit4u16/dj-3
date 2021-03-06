// expressServer.js
// ------------------------------------------------------------------
//
// This server uses the express-js module and the pg module;
// it queries and updates a PG database.
//
// created: Thu Mar 30 16:34:17 2017
// last saved: <2017-March-30 17:58:02>

var app = require('express')();
var pg = require('pg');
var databaseUrl = process.env.DATABASE_URL;
var serverPort = process.env.PORT || 5950;
var gClient = null;
var Promise = require('es6-promise').Promise; // for node that does not support es6

app.get('/status', function(request, response) {
  queryVisitors(response, 'visitorCount');
});

app.post('/visit', function(request, response) {
  gClient.query('INSERT INTO visit (date) VALUES ($1)', [new Date()], function(e) {
    if (e) return onError(e, response);
    queryVisitors(response, 'yourVisitorNumber');
  });
});

// default behavior
app.all(/^\/.*/, function(request, response) {
  response.header('Content-Type', 'application/json')
    .status(404)
    .send('{ "message" : "This is not the server you\'re looking for." }\n');
});

function queryVisitors(response, tag) {
  // get the total number of visits today (including the current visit)
  gClient.query('SELECT COUNT(date) AS count FROM visit', function(e, result) {
    if(e) return onError(e, response);
    var r = {
        stamp: (new Date()).valueOf()
        };
    r[tag || 'visitor'] = result.rows[0].count;
    response.header('content-type', 'application/json')
      .status(200)
      .send(JSON.stringify(r, null, 2) + '\n');
  });
}

function onError(e, response) {
  console.log(e.message, e.stack);
  response.header('content-type', 'application/json')
    .status(500)
    .send(JSON.stringify({error: e.message}, null, 2) + '\n');
}

process.on('unhandledRejection', function(e) {
  console.log(e.message, e.stack);
});


// connect to Postgres, then begin listening for inbound requests.
pg.defaults.ssl = true;
pg.connect(process.env.DATABASE_URL, function(e, client) {
  if (e) throw e;
  gClient = client;
  var query1 = client
    .query('CREATE TABLE IF NOT EXISTS visit (date timestamptz)');

  query1
    .on('end', function(result) {
      app.listen(serverPort, function() {
        console.log('server is listening on %d', serverPort);
      });
    });
});
