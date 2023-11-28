const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
// const uuid = require("uuid");
// const { findSession, saveSession, findAllSessions } = require('./helpers/SessionStorage.js');

const io = require('socket.io')(server, { cors: { origin: "*", credentials: true } });

require('dotenv').config();

app.use(cors({
	origin: "*",
	credentials: true
}))


let ROOMSINFO = [];


io.on("connection", (socket) => {

	socket.on('join-room', ({ roomID, userName }) => {

		socket.join(roomID)
		socket.userName = userName;
		socket.roomID = roomID;

		let check_if_room_exists = ROOMSINFO.find(obj => (obj.roomID === roomID))

		if (check_if_room_exists) {
			if (check_if_room_exists.users.includes(userName)) return;

			check_if_room_exists.users.push(userName)
		} else {
			let newRoomInfo = {
				roomID: roomID,
				users: [userName]
			}
			ROOMSINFO.push(newRoomInfo)
		}

		socket.on("send_message", ({ roomID, message, userName }) => {
			socket.broadcast.to(roomID).emit("send_message", { message, userName })
		})

		setTimeout(() => {
			io.sockets.in(roomID).emit('join-room', { userName, ROOMSINFO })
		}, 1500)
	})

	socket.on('disconnect', () => {
		const userName = socket.userName

		let find_room = ROOMSINFO.find(obj => (obj.roomID === socket.roomID))

		// console.log(find_room)

		if (!find_room) return;

		let user_index = find_room?.users?.indexOf(userName)

		find_room.users.splice(user_index, 1)

		socket.broadcast.to(socket.roomID).emit("disconnect_user", { userName, ROOMSINFO })

		// console.log(socket.userName, " disconnected")
	})

	
	socket.on('another-room', ({roomID, previousID}) => {

		const userName = socket.userName

		let find_previous_room = ROOMSINFO.find(obj => (obj.roomID === previousID))

		let user_index = find_previous_room?.users?.indexOf(userName)

		find_previous_room.users.splice(user_index, 1)

		socket.leave(previousID)

		let check_if_room_exists = ROOMSINFO.find(obj => (obj.roomID === roomID))

		if (check_if_room_exists) {
			if (check_if_room_exists.users.includes(userName)) return;

			check_if_room_exists.users.push(userName)
		} else {
			let newRoomInfo = {
				roomID: roomID,
				users: [userName]
			}
			ROOMSINFO.push(newRoomInfo)
		}

		socket.join(roomID)
		socket.roomID = roomID;

		socket.broadcast.to(previousID).emit("disconnect_user", { userName, ROOMSINFO })

		setTimeout(() => {
			io.sockets.in(roomID).emit('another-room', { userName, ROOMSINFO })
		}, 2000)
	
		// console.log(ROOMSINFO)

	})

})

const PORT = 7000;

server.listen(PORT, () => {
	console.log(`Listening to port ${PORT}`)
});
