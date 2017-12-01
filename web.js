let argv = require("minimist")(process.argv.slice(2));
const auth = require("express-basic-auth");
const express = require("express");
const fs = require("fs");
const https = require("https");
//const imessage = require("osa-imessage");
const socket = require("socket.io");

// Parse arguments
let port = argv["port"] || 8080;
let user = argv["user"] || "admin";
let pass = argv["pass"] || "pick a password";
let key = argv["key"] || "privatekey.pem";
let cert = argv["cert"] || "certificate.pem";

// Setup the express server
const app = express();
const server = https.createServer({
  key: fs.readFileSync(key),
  cert: fs.readFileSync(cert),
}, app);

// Basic authentication
let users = {};
users[user] = pass;
app.use(auth({
  challenge: true,
  users: users,
}));

// Staic routes
app.get("/", function(req, res) {
  res.sendFile("index.html", { root: __dirname });
});

app.get("/socket.io.js", function(req, res) {
  res.sendFile("node_modules/socket.io-client/dist/socket.io.js", { root: __dirname });
});

// Dynamic routes
app.get("/list", function(req, res) {
  res.type("json");
  res.send("{}");
});

app.post("/chat", function(req, res) {
  res.type("json");
  res.send("{}");
});

// Start the server
server.listen(port, function() {
  console.log("Listening on port", port);
});
