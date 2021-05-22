import React, { Component } from "react";
import { toast } from "react-toastify";

import MsgItem from "../msgItem/msgItem";

import "./chat.css";

class Chat extends Component {
	state = {
		imgPickerRef: undefined,
		chatBoxRef: undefined,
		inputBoxRef: undefined,
		txtInput: "",
		msgs: [],
	};
	componentDidMount() {
		toast.success("Loaded chat..!");
		const imgPickerRef = React.createRef();
		const chatBoxRef = React.createRef();
		const inputBoxRef = React.createRef();
		this.setState({ imgPickerRef, chatBoxRef, inputBoxRef }, () => {
			inputBoxRef.current.focus();
		});
	}
	handleTxtInput = (event) => {
		this.setState({ txtInput: event.target.value });
	};
	handleEnter = ({ key }) => {
		key === "Enter" && this.sendMessage();
	};
	pickImage = async () => {
		const imgPicker = this.state.imgPickerRef.current;
		//console.log(imgPicker.value);
		//const imgRef = this.state.imgRef.current;
		const img = URL.createObjectURL(imgPicker.files[0]);
		const blob = await fetch(img).then((r) => r.blob());
		imgPicker.value = "";
		//console.log(img);
		//console.log(blob);
		//imgRef.src = URL.createObjectURL(blob);
		const msg = { id: this.state.msgs.length, type: "image", blob };
		this.addItem(msg);
	};
	addItem = (msg) => {
		const msgs = [...this.state.msgs];
		msgs.push(msg);
		this.setState({ msgs }, () => {
			const chatBox = this.state.chatBoxRef.current;
			chatBox.scrollTop = chatBox.scrollHeight - chatBox.clientHeight;
			//chatBox.scrollIntoView();
			this.state.inputBoxRef.current.focus();
		});
	};
	sendMessage = () => {
		const text = this.state.txtInput;
		if (text === "") return;
		const msg = { id: this.state.msgs.length, type: "text", text };
		this.addItem(msg);
		this.setState({ txtInput: "" });
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
						onChange={this.pickImage}
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
					<button onClick={this.sendMessage}>Send</button>
				</div>
			</div>
		);
	}
}

export default Chat;
