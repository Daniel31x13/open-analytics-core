const assignUser = require('./lib/assignUser');
const geoip = require('fast-geoip');
const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
      origin: '*',
    }
});

const PORT = process.env.PORT || 8080; // Edit port if needed
let count;
let totalClients = [];

// Connect to MongoDB
const uri = "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false"; // Edit accordingly
const MClient = new MongoClient(uri);
MClient.connect().catch(console.error);

io.on('connection', async (socket) => { // On connection
    let clientIp = socket.request.connection.remoteAddress;
    let clientHeader = socket.request.headers['user-agent'];
    let geo = await geoip.lookup(clientIp.slice(7)); // Check location by ip (Does not work for local ip addresses)
    let clientURL;
    let clientReferrer;

    totalClients.push(clientIp); // Add user to array

    count = totalClients.filter(function(item, pos) { return totalClients.indexOf(item) == pos }).length; // The number of unique clients from the array

    const connectDate = new Date()
    let time = connectDate.toString();

    console.clear(); // Clear previous log
    console.log('Total Clients: ' + count);

    io.emit('socketClientID', socket.client.id);
    socket.on('clientMessage', (data) => { // Get url from client
        clientURL = data.url;
        clientReferrer = data.referrer;
    });

    socket.on('disconnect', () => { // On disconnection
        const disconnectDate = new Date()
        let activeTime = Math.ceil((disconnectDate-connectDate)/1000).toString();

        totalClients.splice(totalClients.indexOf(clientIp), 1); // Remove user from array
        count = totalClients.filter(function(item, pos) { return totalClients.indexOf(item) == pos }).length; // Update the number of unique clients from the array
    
        let user = assignUser(clientIp, geo.country, clientHeader, clientURL, clientReferrer, time, activeTime);

        // Add to DB
        MClient.db("DatabaseName").collection("CollectionName").insertOne(user); // Edit 'DatabaseName' & 'CollectionName' accordingly

        console.clear(); // Clear previous log
        
        console.log('Total Clients: ' + count);
    });
});

http.listen(PORT, () => {
    console.log("ALL SET!");
});
