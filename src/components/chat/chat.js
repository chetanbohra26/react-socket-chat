import React, { useState, useEffect, useRef, useCallback } from "react";

import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Resizer from "react-image-file-resizer";

import MsgItem from "../msgItem/msgItem";

import "./chat.css";

const Chat = () => {
	const [txtInput, setTxtInput] = useState("");
	const [msgs, setMsgs] = useState([]);
	const [socket, setSocket] = useState(null);

	const clientIdRef = useRef(uuidv4());
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
			if (msg.timestamp == null) msg.timestamp = Date.now();

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
			if (msg.id !== clientIdRef.current) addItemToChat(msg, false);
		});

		setSocket(sock);

		return () => {
			sock.off("connect");
			sock.off("disconnect");
			sock.off("msg-client");
			sock.disconnect();
		};
	}, [addItemToChat]);

	useEffect(() => {
		scrollToBottom();
	}, [msgs, scrollToBottom]);

	const sendTxtMsg = useCallback(() => {
		const text = txtInput.trim();
		if (!text) return;
		if (!socket) return toast.error("Could not send message!");
		const msg = { type: "text", text };
		msg.id = clientIdRef.current;
		socket.emit("msg-server", msg);
		addItemToChat(msg);
		setTxtInput("");
		inputBoxRef.current?.focus();
	}, [txtInput, socket, addItemToChat]);

	const handleEnter = useCallback(
		(event) => {
			if (!event.isComposing && event.key === "Enter") sendTxtMsg();
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
		if (!socket) {
			toast.error("Could not send message!");
			imgPicker.value = "";
			inputBoxRef.current?.focus();
			return;
		}
		try {
			const file = imgPicker.files?.[0];
			if (!file || file.size === 0) {
				toast.error("Please select a valid image file.");
				return;
			}
			if (!["image/jpeg", "image/png"].includes(file.type)) {
				toast.error("Only JPEG and PNG images are supported.");
				return;
			}
			const img = await resizeFile(file);
			const blob = await fetch(img).then((r) => r.blob());

			const msg = { type: "image", blob, mime: blob.type };
			msg.id = clientIdRef.current;
			socket.emit("msg-server", msg);
			addItemToChat(msg);
		} catch {
			toast.error("Could not send image!");
		} finally {
			imgPicker.value = "";
			inputBoxRef.current?.focus();
		}
	};

	return (
		<div className="chat-container">
			<div className="chat-box" ref={chatBoxRef}>
				{msgs.length === 0 && (
					<div className="chat-empty">
						<div className="chat-empty-icon">💬</div>
						<span className="chat-empty-text">Send a message to get started</span>
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
					onClick={() => imgPickerRef.current?.click()}
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
						onKeyDown={handleEnter}
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
