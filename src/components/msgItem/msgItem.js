import React, { useState, useEffect } from "react";

import "./msgItem.css";

const formatTime = (ts) => {
	if (!ts) return "";
	const d = new Date(ts);
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MsgItem = ({ item }) => {
	const [img, setImg] = useState(null);

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
						<img src={img} alt="shared" className="msg-img" />
					)}
				</div>
				<span className="msg-time">{formatTime(item.timestamp)}</span>
			</div>
		</div>
	);
};

export default MsgItem;
