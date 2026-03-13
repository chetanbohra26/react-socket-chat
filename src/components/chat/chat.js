import React, { useState, useEffect, useRef, useCallback } from "react";

import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Resizer from "react-image-file-resizer";

import MsgItem from "../msgItem/msgItem";

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
		<div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
			{/* Message feed */}
			<div
				className="flex-1 overflow-y-auto px-4 py-4 space-y-1 chat-scroll"
				ref={chatBoxRef}
			>
				{msgs.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 select-none">
						<span className="text-4xl">💬</span>
						<span className="text-sm font-medium">Send a message to get started</span>
					</div>
				)}
				{msgs.map((item) => (
					<MsgItem item={item} key={item.id} />
				))}
			</div>

			{/* Input bar */}
			<div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-slate-200 shadow-sm">
				<input
					type="file"
					style={{ display: "none" }}
					accept="image/jpeg,image/png"
					ref={imgPickerRef}
					onChange={sendImgMsg}
				/>
				<button
					type="button"
					onClick={() => imgPickerRef.current?.click()}
					className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition flex-shrink-0"
					title="Send image"
				>
					<img src="img_pick.svg" alt="Pick" className="w-5 h-5" />
				</button>

				<input
					type="text"
					className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
					placeholder="Type a message..."
					ref={inputBoxRef}
					onChange={(e) => setTxtInput(e.target.value)}
					onKeyDown={handleEnter}
					value={txtInput}
				/>

				<button
					type="button"
					onClick={sendTxtMsg}
					className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 flex items-center justify-center transition flex-shrink-0 shadow-sm"
					title="Send"
				>
					<img src="send_btn.svg" alt="Send" className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};

export default Chat;
