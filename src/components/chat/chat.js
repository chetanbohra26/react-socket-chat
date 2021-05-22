import React, { Component } from "react";

import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

import MsgItem from "../msgItem/msgItem";

import "./chat.css";

class Chat extends Component {
	state = {
		imgPickerRef: React.createRef(),
		chatBoxRef: React.createRef(),
		inputBoxRef: React.createRef(),
		txtInput: "",
		msgs: [],
		socket: undefined,
		clientId: undefined,
	};

	componentDidMount() {
		this.state.inputBoxRef.current.focus();
		this.setState({ clientId: uuidv4() });
		this.socketInit();
	}

	componentWillUnmount() {
		this.state.socket && this.state.socket.disconnect();
	}

	socketInit = () => {
		console.log("env", process.env.NODE_ENV);
		const socket =
			process.env.NODE_ENV === "development"
				? io("http://localhost:7500")
				: io();

		socket.on("connect", () => toast.success("Connected to server...!"));
		socket.on("disconnect", () => toast.error("Disconnected from server"));

		socket.on("msg-client", (msg) => {
			console.log("Message from server", msg);
			if (msg.id !== this.state.clientId) this.addItemToChat(msg, false);
		});

		this.setState({ socket });
	};

	handleTxtInput = (event) => {
		this.setState({ txtInput: event.target.value });
	};

	handleEnter = ({ key }) => {
		key === "Enter" && this.sendTxtMsg();
	};

	sendImgMsg = async () => {
		const imgPicker = this.state.imgPickerRef.current;

		const img = URL.createObjectURL(imgPicker.files[0]);
		const blob = await fetch(img).then((r) => r.blob());

		const msg = {
			type: "image",
			blob,
			mime: blob.type,
		};

		this.sendMsgToServer(msg);
		this.addItemToChat(msg);

		imgPicker.value = "";
	};

	sendTxtMsg = () => {
		const text = this.state.txtInput;
		if (text === "") return;
		const msg = {
			type: "text",
			text,
		};
		this.sendMsgToServer(msg);
		this.addItemToChat(msg);
		this.setState({ txtInput: "" });
	};

	addItemToChat = (msg, isMine = true) => {
		const msgs = [...this.state.msgs];
		msg.id = msgs.length;
		msg.isMine = isMine;

		if (!isMine && msg.type === "image") {
			msg.blob = new Blob([msg.blob], { type: msg.mime });
		}

		msgs.push(msg);
		this.setState({ msgs }, () => {
			const chatBox = this.state.chatBoxRef.current;
			chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
			this.state.inputBoxRef.current.focus();
		});
	};

	sendMsgToServer = (msg) => {
		msg.id = this.state.clientId;
		const { socket } = this.state;
		if (!socket) return toast.error("Could not send message..!");
		socket.emit("msg-server", msg);
	};

	render() {
		return (
			<div className="chat-container">
				<div className="chat-box" ref={this.state.chatBoxRef}>
					{this.state.msgs.map((item) => (
						<MsgItem item={item} key={item.id} />
					))}
				</div>
				<div className="chat-input-container">
					<input
						type="file"
						style={{ display: "none" }}
						accept="image/jpeg,image/png"
						ref={this.state.imgPickerRef}
						onChange={this.sendImgMsg}
					/>
					<button
						onClick={() => this.state.imgPickerRef.current.click()}
					>
						Pick
					</button>
					<input
						type="text"
						className="msg-input"
						placeholder="Enter text to send"
						ref={this.state.inputBoxRef}
						onChange={this.handleTxtInput}
						onKeyUp={this.handleEnter}
						value={this.state.txtInput}
					/>
					<button onClick={this.sendTxtMsg}>Send</button>
				</div>
			</div>
		);
	}
}

export default Chat;
