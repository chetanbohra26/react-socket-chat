import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

const formatTime = (ts) => {
	if (ts == null) return "";
	const d = new Date(ts);
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MsgItem = ({ item }) => {
	const [img, setImg] = useState(null);
	const [showModal, setShowModal] = useState(false);
	const viewBtnRef = useRef(null);
	const closeBtnRef = useRef(null);

	useEffect(() => {
		if (item.type !== "image" || !item.blob) return;
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

	const mime = item.mime?.toLowerCase();
	const mimeToExt = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" };
	const ext = mimeToExt[mime] ?? (mime?.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin");
	const filename = `image-${item.id}.${ext}`;

	const handleDownload = () => {
		if (navigator.canShare) {
			const file = new File([item.blob], filename, { type: item.blob.type });
			if (navigator.canShare({ files: [file] })) {
				navigator.share({ files: [file] }).catch(() => fallbackDownload());
				return;
			}
		}
		fallbackDownload();
	};

	const fallbackDownload = () => {
		if (!img) return;
		const a = document.createElement("a");
		a.href = img;
		a.download = filename;
		a.click();
	};

	useEffect(() => {
		if (!showModal) return;
		closeBtnRef.current?.focus();
		const onKeyDown = (e) => { if (e.key === "Escape") setShowModal(false); };
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			viewBtnRef.current?.focus();
		};
	}, [showModal]);

	const isMine = item.isMine;
	const avatarLabel = isMine ? "Me" : "U";

	return (
		<div className={`flex items-end gap-2 mb-1 ${isMine ? "flex-row-reverse" : ""}`}>
			{/* Avatar */}
			<div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.65rem] font-bold flex-shrink-0 ${isMine ? "bg-indigo-500" : "bg-indigo-300"}`}>
				{avatarLabel}
			</div>

			{/* Bubble + timestamp */}
			<div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
				{item.type === "text" && (
					<div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
						isMine
							? "bg-indigo-500 text-white rounded-br-[4px]"
							: "bg-white text-slate-800 rounded-bl-[4px]"
					}`}>
						{item.text}
					</div>
				)}

				{item.type === "image" && img && (
					<div className="flex flex-col">
						<img
							src={img}
							alt="shared"
							className="h-44 max-w-full rounded-2xl object-cover shadow-md"
						/>
						<div className="flex gap-1.5 mt-1.5">
							<button
								type="button"
								ref={viewBtnRef}
								onClick={() => setShowModal(true)}
								className="flex-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-400 active:opacity-75 text-white rounded-full py-1 min-h-[2rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
							>
								View
							</button>
							<button
								type="button"
								onClick={handleDownload}
								className="flex-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-400 active:opacity-75 text-white rounded-full py-1 min-h-[2rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
							>
								Download
							</button>
						</div>
					</div>
				)}

				<span className={`text-[0.6875rem] text-slate-400 mt-0.5 px-1 ${isMine ? "text-right" : ""}`}>
					{formatTime(item.timestamp)}
				</span>
			</div>

			{/* Lightbox */}
			{showModal &&
				ReactDOM.createPortal(
					<div
						className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4"
						role="dialog"
						aria-modal="true"
						aria-label="Image viewer"
						onClick={() => setShowModal(false)}
					>
						<button
							type="button"
							ref={closeBtnRef}
							onClick={() => setShowModal(false)}
							aria-label="Close"
							className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3"
						>
							&times;
						</button>
						<img
							src={img}
							alt="shared full size"
							className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						/>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleDownload();
							}}
							className="mt-4 px-8 py-2.5 rounded-full border-2 border-white bg-transparent text-white text-sm font-medium hover:bg-white/15 transition min-h-[2.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-3"
						>
							Download
						</button>
					</div>,
					document.body
				)}
		</div>
	);
};

export default MsgItem;
