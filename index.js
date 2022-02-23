const express = require('express')
// https://www.npmjs.com/package/livereload
const livereload = require('livereload')
const app = express()
const http = require('http')
const axios = require('axios')
const { Server } = require("socket.io")

// Create server
const server = http.createServer(app)

// Create socket.io server
const io = new Server(server)

// Use EJS for rendering server side HTML : https://ejs.co/
app.set('view engine', 'ejs')

let cachedQuakes = []
// Gets Earthquake data and formats it for our app
async function getQuakes(bustCache) {
  // Very rudimentary cache to prevent repeat api calls
  if (cachedQuakes.length > 0 && !bustCache) {
    return cachedQuakes
  }

  // List of API endpoints here:
  // https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

  const quakes = []
  const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson')
  // Turn the geojson into simple json for use in our UI
  for (const feature of response.data.features) {
    quakes.push({mag: feature.properties.mag, title: feature.properties.title, url: feature.properties.url})
  }
  cachedQuakes = quakes
  return cachedQuakes
}

// Home route
app.get('/', async function(req, res) {
  quakes = await getQuakes(false)
  res.render('index', {quakes})
})

// Socket.io connections
io.on('connection', (socket) => {
  // Log connections so we can tell if UI is working
  console.log(`A user connected.  Total connections is ${io.engine.clientsCount}.`)
})

// Update data every two minutes
setInterval(async () => {
  if (io.engine.clientsCount > 0) {
    const quakes = await getQuakes(true)
    io.emit('quake data', quakes) 
  }
}, 120000)

// Run livereload on on ejs files in views folder
if (process.env.NODE_ENV !== 'production') {
  var livereloadServer = livereload.createServer({ exts: ['ejs'] })
  livereloadServer.watch(__dirname + "/views")
  console.log('Livereload started')
}

// Run the server
const port = parseInt(process.env.PORT || '8080')
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
