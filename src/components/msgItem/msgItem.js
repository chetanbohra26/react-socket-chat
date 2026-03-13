import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import "./msgItem.css";

const formatTime = (ts) => {
	if (ts == null) return "";
	const d = new Date(ts);
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MsgItem = ({ item }) => {
	const [img, setImg] = useState(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		if (item.type !== "image") return;
		const url = URL.createObjectURL(item.blob);
		setImg(url);
		return () => {
			URL.revokeObjectURL(url);
		};
	// item.blob identity changes when a new Blob is created for each message
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.id]);

	const ext = item.mime === "image/png" ? "png" : "jpg";
	const filename = `image-${item.id}.${ext}`;

	const handleDownload = () => {
		// Use Web Share API on mobile (iOS 15+, modern Android)
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
		const a = document.createElement("a");
		a.href = img;
		a.download = filename;
		a.click();
	};

	const avatarLabel = item.isMine ? "Me" : "U";

	return (
		<div className={`msg-row${item.isMine ? " mine" : ""}`}>
			<div className="msg-avatar">{avatarLabel}</div>
			<div className="msg-bubble-wrap">
				<div
					className={`msg-item${item.isMine ? " mine" : ""}${
						item.type === "image" ? " image" : ""
					}`}
				>
					{item.type === "text" && item.text}
					{item.type === "image" && img && (
						<div className="msg-img-wrap">
							<img src={img} alt="shared" className="msg-img" />
							<div className="msg-img-actions">
								<button
									className="msg-img-btn"
									onClick={() => setShowModal(true)}
								>
									View
								</button>
								<button className="msg-img-btn" onClick={handleDownload}>
									Download
								</button>
							</div>
						</div>
					)}
				</div>
				<span className="msg-time">{formatTime(item.timestamp)}</span>
			</div>

			{showModal &&
				ReactDOM.createPortal(
					<div
						className="msg-lightbox-overlay"
						onClick={() => setShowModal(false)}
					>
						<button
							className="msg-lightbox-close"
							onClick={() => setShowModal(false)}
							aria-label="Close"
						>
							&times;
						</button>
						<img
							src={img}
							alt="shared full size"
							className="msg-lightbox-img"
							onClick={(e) => e.stopPropagation()}
						/>
						<button
							className="msg-lightbox-download"
							onClick={(e) => {
								e.stopPropagation();
								handleDownload();
							}}
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
