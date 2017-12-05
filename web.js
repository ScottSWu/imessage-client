let argv = require("minimist")(process.argv.slice(2));
const auth = require("express-basic-auth");
const express = require("express");
const fs = require("fs");
const https = require("https");
const imessage = require("osa-imessage");
const socket = require("socket.io");

// Parse arguments
let port = argv["port"] || 8080;
let user = argv["user"] || "admin";
let pass = argv["pass"] || "pick a password";
let key = argv["key"] || "privatekey.pem";
let cert = argv["cert"] || "certificate.pem";

// iMessage
const messages = {};
imessage.listen().on("message", data => {
  const id = data.handle;
  if (messages[id]) {
    messages[id].push(data);
  }
  else {
    messages[id] = [data];
  }
});

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
  imessage.getRecentChats(20).then(chats => {
    res.type("json");
    res.send(JSON.stringify(chats.map(chat => {
      return {
        id: chat.recipientId,
        service: chat.serviceName,
      };
    })));
  });
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
  imessage.send(id, msg).then(v => {
    res.sendStatus(200);
  }).catch(e => {
    res.sendStatus(500);
  });
});

// Start the server
server.listen(port, function() {
  console.log("Listening on port", port);
});
