const express = require('express');

const app = express();
const http = require('http').Server(app);
const isDev = process.env.NODE_ENV !== 'production';
const io = require('socket.io')(http, {
	maxHttpBufferSize: 1024 * 1024,
	...(isDev && { cors: { origin: '*' } }),
});

const path = require('path');

app.use(express.static(path.join(__dirname, './../build')));

app.get('*', (_, res) => {
	res.sendFile(path.join(__dirname, './../build', 'index.html'));
});

io.on('connection', (socket) => {
	console.log('A user has connected..!');

	socket.on('disconnect', () => console.log('A user has disconnected..!'));

	socket.on('msg-server', (data) => {
		console.log(data);
		io.emit('msg-client', data);
	});

	socket.on('file-queue', (data) => {
		socket.broadcast.emit('file-queue-client', data);
	});
	socket.on('file-start', (data, cb) => {
		socket.broadcast.emit('file-start-client', data);
		if (typeof cb === 'function') cb();
	});
	socket.on('file-chunk', (data, cb) => {
		socket.broadcast.emit('file-chunk-client', data);
		if (typeof cb === 'function') cb();
	});
	socket.on('file-end', (data, cb) => {
		socket.broadcast.emit('file-end-client', data);
		if (typeof cb === 'function') cb();
	});
});

const port = process.env.PORT || 7500;
http.listen(port, () => console.log(`Listening on port ${port}..!`));
console.log('env', process.env.NODE_ENV);
