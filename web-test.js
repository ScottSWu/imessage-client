let argv = require("minimist")(process.argv.slice(2));
const auth = require("express-basic-auth");
const express = require("express");
const fs = require("fs");
const https = require("https");

// Parse arguments
let port = argv["port"] || 8080;
let user = argv["user"] || "admin";
let pass = argv["pass"] || "pick a password";
let key = argv["key"] || "private/privatekey.pem";
let cert = argv["cert"] || "private/certificate.pem";

// iMessage
const messages = {};
setInterval(() => {
  const data = {
    date: new Date(),
    fromMe: (Math.random() < 0.2),
    handle: "Test ID " + Math.floor(Math.random() * 3),
    message: Math.random(),
  };
  const id = data.handle;
  if (messages[id]) {
    messages[id].push(data);
  }
  else {
    messages[id] = [data];
  }
}, 5000);

// Setup the express server
const app = express();
const server = https.createServer({
  key: fs.readFileSync(key),
  cert: fs.readFileSync(cert),
}, app);

// Add authentication request header
app.use(function(req, res, next) {
  res.set("Access-Control-Allow-Headers", "Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST");
  next();
});

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
app.get("/list", function(req, res) { // List all chats
  console.log("[/list]");
  res.type("json");
  res.send(JSON.stringify([
    {
      id: "Test ID 0",
      service: "SMS",
    },
    {
      id: "Test ID 1",
      service: "SMS",
    },
    {
      id: "Test ID 2",
      service: "iMessage",
    },
  ]));
});

app.post("/chat", function(req, res) { // View a single chat
  console.log("[/chat]");
  const id = req.params["id"];
  const chat = messages[id];
  let start = 0;
  if (req.params["since"] !== undefined) {
    const since = new Date(req.params["since"]);
    for (start = chat.length; start > 0; start--) {
      if (since <= chat[start - 1].data) {
        break;
      }
    }
  }

  const msgs = chat.slice(start);
  res.type("json");
  res.send(JSON.stringify(msgs));
});

app.post("/send", function(req, res) { // Send a message
  console.log("[/send]");
  const id = req.params["id"];
  const msg = req.params["msg"];

  if (Math.random() < 0.5) {
    console.log("Send succeeded");
    res.sendStatus(200);
  }
  else {
    console.log("Send failed");
    res.sendStatus(500);
  }
});

// Start the server
server.listen(port, function() {
  console.log("Listening on port", port);
});
