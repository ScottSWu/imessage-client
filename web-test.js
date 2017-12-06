let argv = require("minimist")(process.argv.slice(2));
const auth = require("express-basic-auth");
const express = require("express");
const fs = require("fs");
const https = require("https");
const socketio = require("socket.io");

// Parse arguments
let port = argv["port"] || 8080;
let user = argv["user"] || "admin";
let pass = argv["pass"] || "pick a password";
let key = argv["key"] || "private/privatekey.pem";
let cert = argv["cert"] || "private/certificate.pem";

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

// iMessage
const messages = new Map();

// Websocket routes
const io = socketio(server);
const connections = new Set();
io.on("connection", function(socket) {
  // List recent chats
  socket.on("list", data => {
    console.log("[:list]");
    data = data || {};
    socket.emit("list", [
      {
        handle: "Test Handle 0",
        service: "SMS",
      },
      {
        handle: "Test Handle 1",
        service: "SMS",
      },
      {
        handle: "Test Handle 2",
        service: "iMessage",
      },
    ]);
  });

  // Send a message
  socket.on("send", data => {
    console.log("[:send]");
    data = data || {};
    if (data.handle && data.text) {
      // TODO Handle bad input / error sending
      if (Math.random() < 0.5) {
        console.log("Send succeeded");
      }
      else {
        console.log("Send failed");
      }
    }
  });

  // List recent chat messages
  socket.on("chat", data => {
    console.log("[:chat]");
    data = data || {};
    const handle = data.handle;
    const limit = data.limit || 50;
    const since = new Date(data.since || 0);

    const gather = (chat, since, limit) => {
      let i = 0;
      let start = 0;
      for (start = chat.length, i = 0; start > 0 && i < limit; start--, i++) {
        if (since <= chat[start - 1].data) {
          break;
        }
      }
      return chat.slice(start)
    };

    let msgs = [];
    if (handle === undefined) {
      // Get recent chats from all chats
      messages.forEach(chat => {
        msgs = msgs.concat(gather(chat, since, limit));
      });
    }
    else if (messages[handle]) {
      msgs = msgs.concat(gather(chat, since, limit));
    }

    socket.emit("chat", msgs);
  });
});

// Fake iMessage client
setInterval(() => {
  const data = {
    date: new Date(),
    fromMe: (Math.random() < 0.2),
    handle: "Test Handle " + Math.floor(Math.random() * 3),
    text: Math.random(),
  };
  const handle = data.handle;
  if (messages.has(handle)) {
    messages.get(handle).push(data);
  }
  else {
    messages.set(handle, [data]);
  }
  io.emit("chat", [data]);
}, 5000);

// Start the server
server.listen(port, function() {
  console.log("Listening on port", port);
});
