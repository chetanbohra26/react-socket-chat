import React, { useState, useEffect, useRef, useCallback } from "react";

import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import Resizer from "react-image-file-resizer";

import MsgItem from "../msgItem/msgItem";

const FILE_CHUNK_SIZE = 64 * 1024; // 64KB per chunk
const FILE_MAX_PARALLEL_CHUNKS = 4; // Send up to 4 chunks concurrently
const FILE_MAX_SIZE = 500 * 1024 * 1024; // 500MB max file size
const FILE_RECEIVE_TIMEOUT = 30000; // 30s inactivity timeout for receiving files

const Chat = ({ setIsOnline = () => {} }) => {
	const [txtInput, setTxtInput] = useState("");
	const [msgs, setMsgs] = useState([]);
	const [socket, setSocket] = useState(null);

	const clientIdRef = useRef(uuidv4());
	const imgPickerRef = useRef(null);
	const filePickerRef = useRef(null);
	const chatBoxRef = useRef(null);
	const inputBoxRef = useRef(null);
	const pendingFilesRef = useRef({});

	const scrollToBottom = useCallback(() => {
		const chatBox = chatBoxRef.current;
		if (chatBox) {
			chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
		}
	}, []);

	const updateFileMsg = useCallback((fileId, updates) => {
		setMsgs((prev) => {
			const idx = prev.findIndex((m) => m.type === "file" && m.fileId === fileId);
			if (idx === -1) return prev;
			const next = [...prev];
			next[idx] = { ...next[idx], ...updates };
			return next;
		});
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

		sock.on("connect", () => {
			setIsOnline(true);
			toast.success("Connected to server!");
		});
		sock.on("disconnect", () => {
			setIsOnline(false);
			toast.error("Disconnected from server");
		});

		sock.on("msg-client", (msg) => {
			if (msg.id !== clientIdRef.current) addItemToChat(msg, false);
		});

		const resetReceiveTimeout = (fileId) => {
			const pending = pendingFilesRef.current[fileId];
			if (!pending) return;
			clearTimeout(pending.timer);
			pending.timer = setTimeout(() => {
				updateFileMsg(fileId, { status: "failed" });
				delete pendingFilesRef.current[fileId];
			}, FILE_RECEIVE_TIMEOUT);
		};

		sock.on("file-start-client", (data) => {
			pendingFilesRef.current[data.fileId] = {
				chunks: new Array(data.totalChunks),
				receivedCount: 0,
				totalChunks: data.totalChunks,
				metadata: data,
				timer: null,
			};
			resetReceiveTimeout(data.fileId);
			addItemToChat(
				{
					type: "file",
					fileId: data.fileId,
					fileName: data.fileName,
					fileSize: data.fileSize,
					mime: data.mime,
					status: "receiving",
					progress: 0,
					blob: null,
				},
				false
			);
		});

		sock.on("file-chunk-client", (data) => {
			const pending = pendingFilesRef.current[data.fileId];
			if (!pending) return;
			pending.chunks[data.chunkIndex] = data.data;
			pending.receivedCount++;
			const progress = pending.receivedCount / pending.totalChunks;
			updateFileMsg(data.fileId, { progress });
			resetReceiveTimeout(data.fileId);
		});

		sock.on("file-end-client", (data) => {
			const pending = pendingFilesRef.current[data.fileId];
			if (!pending) return;
			clearTimeout(pending.timer);
			const blob = new Blob(pending.chunks, {
				type: pending.metadata.mime || "application/octet-stream",
			});
			updateFileMsg(data.fileId, { status: "complete", progress: 1, blob });
			delete pendingFilesRef.current[data.fileId];
		});

		setSocket(sock);

		return () => {
			sock.off("connect");
			sock.off("disconnect");
			sock.off("msg-client");
			sock.off("file-start-client");
			sock.off("file-chunk-client");
			sock.off("file-end-client");
			sock.disconnect();
		};
	}, [addItemToChat, updateFileMsg]);

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

	const sendFileMsg = async () => {
		const filePicker = filePickerRef.current;
		if (!socket) {
			toast.error("Could not send message!");
			filePicker.value = "";
			inputBoxRef.current?.focus();
			return;
		}
		try {
			const file = filePicker.files?.[0];
			if (!file || file.size === 0) {
				toast.error("Please select a valid file.");
				return;
			}
			if (file.size > FILE_MAX_SIZE) {
				toast.error(
					`File is too large. Maximum size is ${FILE_MAX_SIZE / (1024 * 1024)} MB.`
				);
				return;
			}

			const fileId = uuidv4();
			const arrayBuffer = await file.arrayBuffer();
			const totalChunks = Math.ceil(arrayBuffer.byteLength / FILE_CHUNK_SIZE);
			const mime = file.type || "application/octet-stream";

			// Add placeholder message to chat
			addItemToChat({
				type: "file",
				fileId,
				fileName: file.name,
				fileSize: file.size,
				mime,
				status: "sending",
				progress: 0,
				blob: null,
			});

			// Emit file-start and wait for ack
			await new Promise((resolve, reject) => {
				let timer = setTimeout(() => reject(new Error("file-start timeout")), 10000);
				socket.emit(
					"file-start",
					{
						fileId,
						fileName: file.name,
						fileSize: file.size,
						mime,
						totalChunks,
						senderId: clientIdRef.current,
					},
					() => {
						clearTimeout(timer);
						resolve();
					}
				);
			});

			// Sliding window chunk send
			await new Promise((resolve, reject) => {
				let nextChunkToSend = 0;
				let ackedCount = 0;
				let settled = false;

				// Safety timeout: 5s per chunk + 30s base as absolute fallback
				let timer = setTimeout(() => {
					if (!settled) {
						settled = true;
						reject(new Error("File transfer timeout"));
					}
				}, totalChunks * 5000 + 30000);

				const done = (fn) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					fn();
				};

				const sendNextChunk = () => {
					if (settled || nextChunkToSend >= totalChunks) return;
					const chunkIndex = nextChunkToSend++;
					const start = chunkIndex * FILE_CHUNK_SIZE;
					const end = Math.min(start + FILE_CHUNK_SIZE, arrayBuffer.byteLength);
					const data = arrayBuffer.slice(start, end);

					socket.emit("file-chunk", { fileId, chunkIndex, data }, () => {
						if (settled) return;
						ackedCount++;
						updateFileMsg(fileId, { progress: ackedCount / totalChunks });
						if (ackedCount === totalChunks) {
							done(resolve);
						} else {
							sendNextChunk();
						}
					});
				};

				// Launch initial batch
				const initialBatch = Math.min(FILE_MAX_PARALLEL_CHUNKS, totalChunks);
				for (let i = 0; i < initialBatch; i++) {
					sendNextChunk();
				}
			});

			// Emit file-end
			await new Promise((resolve) => {
				socket.emit("file-end", { fileId }, () => resolve());
			});

			// Mark complete with the original file as blob
			updateFileMsg(fileId, { status: "complete", progress: 1, blob: file });
		} catch (err) {
			toast.error("Could not send file!");
		} finally {
			filePicker.value = "";
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
					<MsgItem item={item} key={item.type === "file" ? item.fileId : item.id} />
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
				<input
					type="file"
					style={{ display: "none" }}
					ref={filePickerRef}
					onChange={sendFileMsg}
				/>
				<button
					type="button"
					onClick={() => imgPickerRef.current?.click()}
					className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition flex-shrink-0"
					title="Send image"
				>
					<img src="img_pick.svg" alt="Pick" className="w-5 h-5" />
				</button>
				<button
					type="button"
					onClick={() => filePickerRef.current?.click()}
					className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition flex-shrink-0"
					title="Send file"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
					</svg>
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
