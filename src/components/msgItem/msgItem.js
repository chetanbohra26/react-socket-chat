import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FileIcon, DownloadIcon } from '../../assets/icons';

const formatTime = (ts) => {
	if (ts == null) return '';
	const d = new Date(ts);
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatSize = (bytes) => {
	if (bytes == null || bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
	return `${size} ${units[i]}`;
};

const MsgItem = ({ item }) => {
	const [img, setImg] = useState(null);
	const [fileUrl, setFileUrl] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const viewBtnRef = useRef(null);
	const closeBtnRef = useRef(null);

	useEffect(() => {
		if (item.type !== 'image' || !item.blob) return;
		let url;
		try {
			url = URL.createObjectURL(item.blob);
		} catch {
			return;
		}
		setImg(url);
		return () => {
			URL.revokeObjectURL(url);
		};
		// item.blob identity changes when a new Blob is created for each message
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.id]);

	useEffect(() => {
		if (item.type !== 'file' || item.status !== 'complete' || !item.blob)
			return;
		let url;
		try {
			url = URL.createObjectURL(item.blob);
		} catch {
			return;
		}
		setFileUrl(url);
		return () => {
			URL.revokeObjectURL(url);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.status]);

	const mime = item.mime?.toLowerCase();
	const mimeToExt = {
		'image/png': 'png',
		'image/jpeg': 'jpg',
		'image/jpg': 'jpg',
		'image/gif': 'gif',
		'image/webp': 'webp',
		'image/svg+xml': 'svg',
	};
	const ext =
		mimeToExt[mime] ??
		(mime?.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin');
	const filename = `image-${item.id}.${ext}`;

	const handleDownload = () => {
		fallbackDownload();
	};

	const fallbackDownload = () => {
		if (!img) return;
		const a = document.createElement('a');
		a.href = img;
		a.download = filename;
		a.click();
	};

	const handleFileDownload = () => {
		if (!fileUrl) return;
		const a = document.createElement('a');
		a.href = fileUrl;
		a.download = item.fileName || 'download';
		a.click();
	};

	useEffect(() => {
		if (!showModal) return;
		closeBtnRef.current?.focus();
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setShowModal(false);
		};
		document.addEventListener('keydown', onKeyDown);
		const viewBtn = viewBtnRef.current;
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			viewBtn?.focus();
		};
	}, [showModal]);

	const isMine = item.isMine;
	const avatarLabel = isMine ? 'Me' : 'U';

	return (
		<div
			className={`flex items-end gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}
		>
			{/* Avatar */}
			<div
				className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.65rem] font-bold flex-shrink-0 ${isMine ? 'bg-indigo-500' : 'bg-indigo-300'}`}
			>
				{avatarLabel}
			</div>

			{/* Bubble + timestamp */}
			<div
				className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}
			>
				{item.type === 'text' && (
					<div
						className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
							isMine
								? 'bg-indigo-500 text-white rounded-br-[4px]'
								: 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-[4px]'
						}`}
					>
						{item.text}
					</div>
				)}

				{item.type === 'image' && img && (
					<div className='flex flex-col'>
						<img
							src={img}
							alt='shared'
							className='h-44 max-w-full rounded-2xl object-cover shadow-md'
						/>
						<div className='flex gap-1.5 mt-1.5'>
							<button
								type='button'
								ref={viewBtnRef}
								onClick={() => setShowModal(true)}
								className='flex-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-400 active:opacity-75 text-white rounded-full py-1 min-h-[2rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2'
							>
								View
							</button>
							<button
								type='button'
								onClick={handleDownload}
								className='flex-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-400 active:opacity-75 text-white rounded-full py-1 min-h-[2rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2'
							>
								Download
							</button>
						</div>
					</div>
				)}

				{item.type === 'file' && (
					<div
						className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl shadow-sm min-w-[200px] ${
							isMine
								? 'bg-indigo-500 text-white rounded-br-[4px]'
								: 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-[4px]'
						}`}
					>
						{/* File icon */}
						<div
							className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
								isMine
									? 'bg-indigo-400'
									: 'bg-slate-100 dark:bg-slate-600'
							}`}
						>
							<FileIcon className='w-5 h-5' />
						</div>
						{/* File info + progress */}
						<div className='flex flex-col min-w-0 flex-1'>
							<span className='text-sm font-medium truncate'>
								{item.fileName || 'Unknown file'}
							</span>
							<span
								className={`text-xs ${
									isMine
										? 'text-indigo-200'
										: 'text-slate-400'
								}`}
							>
								{formatSize(item.fileSize)}
								{item.mime &&
								item.mime !== 'application/octet-stream'
									? ` \u00b7 ${item.mime.split('/').pop().toUpperCase()}`
									: ''}
							</span>
							{/* Queued indicator */}
							{item.status === 'queued' && (
								<span
									className={`text-[0.625rem] mt-0.5 block ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}
								>
									Queued
								</span>
							)}
							{/* Progress bar during transfer */}
							{(item.status === 'sending' ||
								item.status === 'receiving') && (
								<div className='mt-1.5'>
									<div
										className={`w-full h-1.5 rounded-full overflow-hidden ${
											isMine
												? 'bg-indigo-400'
												: 'bg-slate-200 dark:bg-slate-600'
										}`}
									>
										<div
											className={`h-full rounded-full ${
												isMine
													? 'bg-white'
													: 'bg-indigo-500'
											}`}
											style={{
												width: `${(item.progress || 0) * 100}%`,
											}}
										/>
									</div>
									<span
										className={`text-[0.625rem] mt-0.5 block ${
											isMine
												? 'text-indigo-200'
												: 'text-slate-400'
										}`}
									>
										{item.status === 'sending'
											? 'Sending'
											: 'Receiving'}
										...{' '}
										{Math.round((item.progress || 0) * 100)}
										%
									</span>
								</div>
							)}
						</div>
						{/* Failed label */}
						{item.status === 'failed' && (
							<span
								className={`text-xs mt-1 ${
									isMine ? 'text-red-200' : 'text-red-500'
								}`}
							>
								Transfer failed
							</span>
						)}
						{/* Download button (only when complete) */}
						{item.status === 'complete' && (
							<button
								type='button'
								onClick={handleFileDownload}
								className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
									isMine
										? 'bg-indigo-400 hover:bg-indigo-300 text-white'
										: 'bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300'
								}`}
								title='Download'
							>
								<DownloadIcon className='w-4 h-4' />
							</button>
						)}
					</div>
				)}

				<span
					className={`text-[0.6875rem] text-slate-400 dark:text-slate-500 mt-0.5 px-1 ${isMine ? 'text-right' : ''}`}
				>
					{formatTime(item.timestamp)}
				</span>
			</div>

			{/* Lightbox */}
			{showModal &&
				ReactDOM.createPortal(
					<div
						className='fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4'
						role='dialog'
						aria-modal='true'
						aria-label='Image viewer'
						onClick={() => setShowModal(false)}
					>
						<button
							type='button'
							ref={closeBtnRef}
							onClick={() => setShowModal(false)}
							aria-label='Close'
							className='absolute top-3 right-3 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3'
						>
							&times;
						</button>
						<img
							src={img}
							alt='shared full size'
							className='max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl'
							onClick={(e) => e.stopPropagation()}
						/>
						<button
							type='button'
							onClick={(e) => {
								e.stopPropagation();
								handleDownload();
							}}
							className='mt-4 px-8 py-2.5 rounded-full border-2 border-white bg-transparent text-white text-sm font-medium hover:bg-white/15 transition min-h-[2.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3'
						>
							Download
						</button>
					</div>,
					document.body,
				)}
		</div>
	);
};

export default MsgItem;
