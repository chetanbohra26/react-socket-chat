import React, { useState, useEffect, useRef, useCallback } from "react";

import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Resizer from "react-image-file-resizer";

import MsgItem from "../msgItem/msgItem";

import "./chat.css";

const clientId = uuidv4();

const Chat = () => {
	const [txtInput, setTxtInput] = useState("");
	const [msgs, setMsgs] = useState([]);
	const [socket, setSocket] = useState(null);

	const imgPickerRef = useRef(null);
	const chatBoxRef = useRef(null);
	const inputBoxRef = useRef(null);

	const scrollToBottom = useCallback(() => {
		const chatBox = chatBoxRef.current;
		if (chatBox) {
			chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
		}
	}, []);

	const addItemToChat = useCallback(
		(msg, isMine = true) => {
			if (!isMine && msg.type === "image") {
				msg.blob = new Blob([msg.blob], { type: msg.mime });
			}
			msg.isMine = isMine;
			msg.timestamp = Date.now();

			setMsgs((prev) => {
				const next = [...prev];
				msg.id = next.length;
				next.push(msg);
				return next;
			});
		},
		[]
	);

	useEffect(() => {
		if (inputBoxRef.current) inputBoxRef.current.focus();

		const sock =
			process.env.NODE_ENV === "development"
				? io("http://localhost:7500")
				: io();

		sock.on("connect", () => toast.success("Connected to server!"));
		sock.on("disconnect", () => toast.error("Disconnected from server"));

		sock.on("msg-client", (msg) => {
			if (msg.id !== clientId) addItemToChat(msg, false);
		});

		setSocket(sock);

		return () => {
			sock.disconnect();
		};
	}, [addItemToChat]);

	useEffect(() => {
		scrollToBottom();
		if (inputBoxRef.current) inputBoxRef.current.focus();
	}, [msgs, scrollToBottom]);

	const sendMsgToServer = useCallback(
		(msg) => {
			if (!socket) return toast.error("Could not send message!");
			msg.id = clientId;
			socket.emit("msg-server", msg);
		},
		[socket]
	);

	const sendTxtMsg = useCallback(() => {
		const text = txtInput.trim();
		if (!text) return;
		const msg = { type: "text", text };
		sendMsgToServer(msg);
		addItemToChat(msg);
		setTxtInput("");
	}, [txtInput, sendMsgToServer, addItemToChat]);

	const handleEnter = useCallback(
		({ key }) => {
			if (key === "Enter") sendTxtMsg();
		},
		[sendTxtMsg]
	);

	const resizeFile = (file) => {
		const ext = file.name.split(".").pop().toLowerCase();
		return new Promise((resolve) => {
			Resizer.imageFileResizer(
				file,
				ext === "png" ? 720 : 1080,
				ext === "png" ? 720 : 1080,
				ext === "png" ? "PNG" : "JPEG",
				80,
				0,
				(uri) => resolve(uri),
				"base64"
			);
		});
	};

	const sendImgMsg = async () => {
		const imgPicker = imgPickerRef.current;
		const file = imgPicker.files[0];
		const img = await resizeFile(file);
		const blob = await fetch(img).then((r) => r.blob());

		const msg = { type: "image", blob, mime: blob.type };
		sendMsgToServer(msg);
		addItemToChat(msg);
		imgPicker.value = "";
	};

	return (
		<div className="chat-container">
			<div className="chat-box" ref={chatBoxRef}>
				{msgs.length === 0 && (
					<div className="chat-empty">
						<div className="chat-empty-icon">💬</div>
						<span className="chat-empty-text">Say hello to start chatting!</span>
					</div>
				)}
				{msgs.map((item) => (
					<MsgItem item={item} key={item.id} />
				))}
			</div>
			<div className="chat-input-container">
				<input
					type="file"
					style={{ display: "none" }}
					accept="image/jpeg,image/png"
					ref={imgPickerRef}
					onChange={sendImgMsg}
				/>
				<button
					onClick={() => imgPickerRef.current.click()}
					className="chat-icon-btn"
					title="Send image"
				>
					<img src="img_pick.svg" alt="Pick" />
				</button>
				<div className="msg-input-wrapper">
					<input
						type="text"
						className="msg-input"
						placeholder="Type a message..."
						ref={inputBoxRef}
						onChange={(e) => setTxtInput(e.target.value)}
						onKeyUp={handleEnter}
						value={txtInput}
					/>
				</div>
				<button onClick={sendTxtMsg} className="chat-send-btn" title="Send">
					<img src="send_btn.svg" alt="Send" />
				</button>
			</div>
		</div>
	);
};

export default Chat;
