const express = require("express");

const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

const path = require("path");

app.use(express.static(path.join(__dirname, "./../build")));

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "./../build", "index.html"));
});

io.on("connection", (socket) => {
	console.log("A user has connected..!");

	socket.on("disconnect", () => console.log("A user has disconnected..!"));

	socket.on("msg-server", (data) => {
		console.log(data);
		io.emit("msg-client", data);
	});
});

const port = process.env.PORT || 7500;
http.listen(port, () => console.log(`Listening on port ${port}..!`));
console.log("env", process.env.NODE_ENV);
