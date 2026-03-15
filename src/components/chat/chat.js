import React, { useState, useEffect, useRef, useCallback } from 'react';

import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Resizer from 'react-image-file-resizer';

import MsgItem from '../msgItem/msgItem';
import { ImageIcon, AttachIcon } from '../../assets/icons';

const FILE_CHUNK_SIZE = 64 * 1024; // 64KB per chunk
const FILE_MAX_PARALLEL_CHUNKS = 20; // Send up to 20 chunks concurrently
const FILE_MAX_SIZE = 5120 * 1024 * 1024; // 5GB max file size
const FILE_RECEIVE_TIMEOUT = 30000; // 30s inactivity timeout for receiving files
const FILE_MAX_CHUNKS = Math.ceil(FILE_MAX_SIZE / FILE_CHUNK_SIZE); // Max chunks based on max file size

const Chat = ({ setIsOnline = () => {} }) => {
	const [txtInput, setTxtInput] = useState('');
	const [msgs, setMsgs] = useState([]);
	const [socket, setSocket] = useState(null);
	const [isDragging, setIsDragging] = useState(false);

	const clientIdRef = useRef(uuidv4());
	const imgPickerRef = useRef(null);
	const filePickerRef = useRef(null);
	const chatBoxRef = useRef(null);
	const inputBoxRef = useRef(null);
	const pendingFilesRef = useRef({});
	const dragCounterRef = useRef(0);

	const scrollToBottom = useCallback(() => {
		const chatBox = chatBoxRef.current;
		if (chatBox) {
			chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
		}
	}, []);

	const updateFileMsg = useCallback((fileId, updates) => {
		setMsgs((prev) => {
			const idx = prev.findIndex(
				(m) => m.type === 'file' && m.fileId === fileId,
			);
			if (idx === -1) return prev;
			const next = [...prev];
			next[idx] = { ...next[idx], ...updates };
			return next;
		});
	}, []);

	const addItemToChat = useCallback((msg, isMine = true) => {
		if (!isMine && msg.type === 'image') {
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
	}, []);

	useEffect(() => {
		if (inputBoxRef.current) inputBoxRef.current.focus();

		const sock =
			process.env.NODE_ENV === 'development'
				? io('http://localhost:7500')
				: io();

		sock.on('connect', () => {
			setIsOnline(true);
			toast.success('Connected to server!');
		});
		sock.on('disconnect', () => {
			setIsOnline(false);
			toast.error('Disconnected from server');
			// Clean up any in-progress file receives
			for (const fileId of Object.keys(pendingFilesRef.current)) {
				const pending = pendingFilesRef.current[fileId];
				clearTimeout(pending.timer);
				updateFileMsg(fileId, { status: 'failed' });
				delete pendingFilesRef.current[fileId];
			}
		});

		sock.on('msg-client', (msg) => {
			if (msg.id !== clientIdRef.current) addItemToChat(msg, false);
		});

		sock.on('file-queue-client', (data) => {
			addItemToChat(
				{
					type: 'file',
					fileId: data.fileId,
					fileName: data.fileName,
					fileSize: data.fileSize,
					mime: data.mime,
					status: 'queued',
					progress: 0,
					blob: null,
				},
				false,
			);
		});

		const resetReceiveTimeout = (fileId) => {
			const pending = pendingFilesRef.current[fileId];
			if (!pending) return;
			clearTimeout(pending.timer);
			pending.timer = setTimeout(() => {
				updateFileMsg(fileId, { status: 'failed' });
				delete pendingFilesRef.current[fileId];
			}, FILE_RECEIVE_TIMEOUT);
		};

		sock.on('file-start-client', (data) => {
			const totalChunks = data.totalChunks;
			if (
				!Number.isInteger(totalChunks) ||
				totalChunks <= 0 ||
				totalChunks > FILE_MAX_CHUNKS
			) {
				return;
			}
			if (
				data.fileSize == null ||
				!Number.isFinite(data.fileSize) ||
				data.fileSize <= 0 ||
				data.fileSize > FILE_MAX_SIZE
			) {
				return;
			}
			pendingFilesRef.current[data.fileId] = {
				chunks: new Array(totalChunks),
				receivedCount: 0,
				accumulatedBytes: 0,
				totalChunks,
				metadata: data,
				timer: null,
			};
			resetReceiveTimeout(data.fileId);
			updateFileMsg(data.fileId, { status: 'receiving', progress: 0 });
		});

		sock.on('file-chunk-client', (data) => {
			const pending = pendingFilesRef.current[data.fileId];
			if (!pending) return;
			const idx = data.chunkIndex;
			if (!Number.isInteger(idx) || idx < 0 || idx >= pending.totalChunks)
				return;
			if (pending.chunks[idx] !== undefined) return; // duplicate
			const chunkSize = data.data?.byteLength ?? data.data?.length ?? 0;
			if (pending.accumulatedBytes + chunkSize > FILE_MAX_SIZE) {
				clearTimeout(pending.timer);
				delete pendingFilesRef.current[data.fileId];
				updateFileMsg(data.fileId, { status: 'failed' });
				return;
			}
			pending.chunks[idx] = data.data;
			pending.receivedCount++;
			pending.accumulatedBytes += chunkSize;
			const progress =
				pending.accumulatedBytes / pending.metadata.fileSize;
			updateFileMsg(data.fileId, { progress });
			resetReceiveTimeout(data.fileId);
		});

		sock.on('file-end-client', (data) => {
			const pending = pendingFilesRef.current[data.fileId];
			if (!pending) return;
			clearTimeout(pending.timer);
			const hasHoles = pending.chunks.some((c) => c === undefined);
			if (hasHoles) {
				updateFileMsg(data.fileId, { status: 'failed' });
			} else {
				const blob = new Blob(pending.chunks, {
					type: pending.metadata.mime || 'application/octet-stream',
				});
				updateFileMsg(data.fileId, {
					status: 'complete',
					progress: 1,
					blob,
				});
			}
			delete pendingFilesRef.current[data.fileId];
		});

		setSocket(sock);

		return () => {
			sock.off('connect');
			sock.off('disconnect');
			sock.off('msg-client');
			sock.off('file-queue-client');
			sock.off('file-start-client');
			sock.off('file-chunk-client');
			sock.off('file-end-client');
			sock.disconnect();
			// Clear any pending receive timers to avoid post-unmount state updates
			for (const fileId of Object.keys(pendingFilesRef.current)) {
				clearTimeout(pendingFilesRef.current[fileId].timer);
			}
			pendingFilesRef.current = {};
		};
	}, [addItemToChat, updateFileMsg, setIsOnline]);

	const msgCountRef = useRef(0);
	useEffect(() => {
		if (msgs.length > msgCountRef.current) {
			msgCountRef.current = msgs.length;
			scrollToBottom();
		}
	}, [msgs, scrollToBottom]);

	const sendTxtMsg = useCallback(() => {
		const text = txtInput.trim();
		if (!text) return;
		if (!socket) return toast.error('Could not send message!');
		const msg = { type: 'text', text };
		msg.id = clientIdRef.current;
		socket.emit('msg-server', msg);
		addItemToChat(msg);
		setTxtInput('');
		inputBoxRef.current?.focus();
	}, [txtInput, socket, addItemToChat]);

	const handleEnter = useCallback(
		(event) => {
			if (!event.isComposing && event.key === 'Enter') sendTxtMsg();
		},
		[sendTxtMsg],
	);

	const resizeFile = (file) => {
		const ext = file.name.split('.').pop().toLowerCase();
		return new Promise((resolve) => {
			Resizer.imageFileResizer(
				file,
				ext === 'png' ? 720 : 1080,
				ext === 'png' ? 720 : 1080,
				ext === 'png' ? 'PNG' : 'JPEG',
				80,
				0,
				(uri) => resolve(uri),
				'base64',
			);
		});
	};

	const sendImgMsg = async () => {
		const imgPicker = imgPickerRef.current;
		if (!socket) {
			toast.error('Could not send message!');
			imgPicker.value = '';
			inputBoxRef.current?.focus();
			return;
		}
		try {
			const file = imgPicker.files?.[0];
			if (!file || file.size === 0) {
				toast.error('Please select a valid image file.');
				return;
			}
			if (!['image/jpeg', 'image/png'].includes(file.type)) {
				toast.error('Only JPEG and PNG images are supported.');
				return;
			}
			const img = await resizeFile(file);
			const blob = await fetch(img).then((r) => r.blob());

			const msg = { type: 'image', blob, mime: blob.type };
			msg.id = clientIdRef.current;
			socket.emit('msg-server', msg);
			addItemToChat(msg);
		} catch {
			toast.error('Could not send image!');
		} finally {
			imgPicker.value = '';
			inputBoxRef.current?.focus();
		}
	};

	const sendFileMsg = async (droppedFile = null, existingFileId = null) => {
		const filePicker = filePickerRef.current;
		if (!socket) {
			toast.error('Could not send message!');
			if (!droppedFile) filePicker.value = '';
			inputBoxRef.current?.focus();
			return;
		}
		let fileId = null;
		try {
			const file = droppedFile ?? filePicker.files?.[0];
			if (!file || file.size === 0) {
				toast.error('Please select a valid file.');
				return;
			}
			if (file.size > FILE_MAX_SIZE) {
				const mb = FILE_MAX_SIZE / (1024 * 1024);
				const sizeStr = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
				toast.error(`File is too large. Maximum size is ${sizeStr}.`);
				return;
			}

			fileId = existingFileId ?? uuidv4();
			const totalChunks = Math.ceil(file.size / FILE_CHUNK_SIZE);
			const mime = file.type || 'application/octet-stream';

			if (existingFileId) {
				updateFileMsg(fileId, { status: 'sending' });
			} else {
				addItemToChat({
					type: 'file',
					fileId,
					fileName: file.name,
					fileSize: file.size,
					mime,
					status: 'sending',
					progress: 0,
					blob: null,
				});
			}

			// Emit file-start and wait for ack
			await new Promise((resolve, reject) => {
				let timer = setTimeout(
					() => reject(new Error('file-start timeout')),
					10000,
				);
				socket.emit(
					'file-start',
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
					},
				);
			});

			// Sliding window chunk send
			await new Promise((resolve, reject) => {
				let nextChunkToSend = 0;
				let ackedCount = 0;
				let ackedBytes = 0;
				let settled = false;

				// Safety timeout: 5s per chunk + 30s base as absolute fallback
				let timer = setTimeout(
					() => {
						if (!settled) {
							settled = true;
							reject(new Error('File transfer timeout'));
						}
					},
					totalChunks * 5000 + 30000,
				);

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
					const end = Math.min(start + FILE_CHUNK_SIZE, file.size);

					file.slice(start, end)
						.arrayBuffer()
						.then((data) => {
							if (settled) return;
							socket.emit(
								'file-chunk',
								{ fileId, chunkIndex, data },
								() => {
									if (settled) return;
									ackedCount++;
									ackedBytes += end - start;
									updateFileMsg(fileId, {
										progress: ackedBytes / file.size,
									});
									if (ackedCount === totalChunks) {
										done(resolve);
									} else {
										sendNextChunk();
									}
								},
							);
						})
						.catch(() => {
							done(() =>
								reject(new Error('Failed to read file chunk')),
							);
						});
				};

				// Launch initial batch
				const initialBatch = Math.min(
					FILE_MAX_PARALLEL_CHUNKS,
					totalChunks,
				);
				for (let i = 0; i < initialBatch; i++) {
					sendNextChunk();
				}
			});

			// Emit file-end and wait for ack with timeout
			await new Promise((resolve, reject) => {
				let timer = setTimeout(
					() => reject(new Error('file-end timeout')),
					10000,
				);
				socket.emit('file-end', { fileId }, () => {
					clearTimeout(timer);
					resolve();
				});
			});

			// Mark complete with the original file as blob
			updateFileMsg(fileId, {
				status: 'complete',
				progress: 1,
				blob: file,
			});
		} catch (err) {
			toast.error('Could not send file!');
			if (fileId) {
				updateFileMsg(fileId, { status: 'failed' });
			}
		} finally {
			if (!droppedFile) filePicker.value = '';
			inputBoxRef.current?.focus();
		}
	};

	return (
		<div
			className='relative flex flex-col flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900'
			onDragEnter={(e) => {
				e.preventDefault();
				dragCounterRef.current++;
				setIsDragging(true);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				dragCounterRef.current = Math.max(
					0,
					dragCounterRef.current - 1,
				);
				if (dragCounterRef.current === 0) setIsDragging(false);
			}}
			onDragOver={(e) => e.preventDefault()}
			onDrop={async (e) => {
				e.preventDefault();
				dragCounterRef.current = 0;
				setIsDragging(false);
				const files = [...e.dataTransfer.files];
				const queue = files.map((f) => {
					const fileId = uuidv4();
					addItemToChat({
						type: 'file',
						fileId,
						fileName: f.name,
						fileSize: f.size,
						mime: f.type || 'application/octet-stream',
						status: 'queued',
						progress: 0,
						blob: null,
					});
					socket?.emit('file-queue', {
						fileId,
						fileName: f.name,
						fileSize: f.size,
						mime: f.type || 'application/octet-stream',
					});
					return { f, fileId };
				});
				for (const { f, fileId } of queue) await sendFileMsg(f, fileId);
			}}
		>
			{isDragging && (
				<div className='absolute inset-0 z-10 flex items-center justify-center bg-indigo-500/20 border-2 border-dashed border-indigo-400 rounded-lg pointer-events-none'>
					<span className='text-indigo-400 font-semibold text-lg'>
						Drop to send file
					</span>
				</div>
			)}

			{/* Message feed */}
			<div
				className='flex-1 overflow-y-auto px-4 py-4 space-y-1 chat-scroll'
				ref={chatBoxRef}
			>
				{msgs.length === 0 && (
					<div className='flex flex-col items-center justify-center h-full gap-2 text-slate-400 dark:text-slate-500 select-none'>
						<span className='text-4xl'>💬</span>
						<span className='text-sm font-medium'>
							Send a message to get started
						</span>
					</div>
				)}
				{msgs.map((item) => (
					<MsgItem
						item={item}
						key={item.type === 'file' ? item.fileId : item.id}
					/>
				))}
			</div>

			{/* Disclaimer */}
			<div className='text-center text-xs text-slate-400 dark:text-slate-500 py-1 select-none'>
				Chat is not saved — refresh the page to clear messages.
			</div>

			{/* Input bar */}
			<div className='flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-sm'>
				<input
					type='file'
					style={{ display: 'none' }}
					accept='image/jpeg,image/png'
					ref={imgPickerRef}
					onChange={sendImgMsg}
				/>
				<input
					type='file'
					multiple
					style={{ display: 'none' }}
					ref={filePickerRef}
					onChange={async (e) => {
						const files = [...e.target.files];
						filePickerRef.current.value = '';
						const queue = files.map((f) => {
							const fileId = uuidv4();
							addItemToChat({
								type: 'file',
								fileId,
								fileName: f.name,
								fileSize: f.size,
								mime: f.type || 'application/octet-stream',
								status: 'queued',
								progress: 0,
								blob: null,
							});
							socket?.emit('file-queue', {
								fileId,
								fileName: f.name,
								fileSize: f.size,
								mime: f.type || 'application/octet-stream',
							});
							return { f, fileId };
						});
						for (const { f, fileId } of queue)
							await sendFileMsg(f, fileId);
					}}
				/>
				<button
					type='button'
					onClick={() => imgPickerRef.current?.click()}
					className='w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex-shrink-0'
					title='Send image'
				>
					<ImageIcon className='w-5 h-5' />
				</button>
				<button
					type='button'
					onClick={() => filePickerRef.current?.click()}
					className='w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex-shrink-0'
					title='Send file'
				>
					<AttachIcon className='w-5 h-5' />
				</button>

				<input
					type='text'
					className='flex-1 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition'
					placeholder='Type a message...'
					ref={inputBoxRef}
					onChange={(e) => setTxtInput(e.target.value)}
					onKeyDown={handleEnter}
					value={txtInput}
				/>

				<button
					type='button'
					onClick={sendTxtMsg}
					className='w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 flex items-center justify-center transition flex-shrink-0 shadow-sm'
					title='Send'
				>
					<img src='send_btn.svg' alt='Send' className='w-4 h-4' />
				</button>
			</div>
		</div>
	);
};

export default Chat;
