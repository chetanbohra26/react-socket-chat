import React from "react";

import "./msgItem.css";

const getItemHeight = (img) => {};

const MsgItem = ({ item }) => {
	const img =
		item.type === "image" ? URL.createObjectURL(item.blob) : undefined;
	return (
		<div className="msg-item">
			{item.type === "text" ? <h3>{item.text}</h3> : null}
			{item.type === "image" ? (
				<img
					src={img}
					alt=""
					className="msg-img"
					style={{ height: getItemHeight(img) }}
				/>
			) : null}
		</div>
	);
};

export default MsgItem;
