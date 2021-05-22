import React from "react";

import "./msgItem.css";

const MsgItem = ({ item }) => {
	//console.log(item.blob);
	const img =
		item.type === "image" ? URL.createObjectURL(item.blob) : undefined;
	return (
		<div
			className={
				"msg-item" +
				(item.type === "image" ? " image" : "") +
				(item.isMine ? " right" : "")
			}
		>
			{item.type === "text" ? `${item.text}` : null}
			{item.type === "image" ? (
				<img src={img} alt="" className="msg-img" />
			) : null}
		</div>
	);
};

export default MsgItem;
