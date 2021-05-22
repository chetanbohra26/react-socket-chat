import React, { Component } from "react";

import Navbar from "./components/navbar/navbar";
import Chat from "./components/chat/chat";

import { toast, ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";
import "./App.css";

class App extends Component {
	state = {};
	componentDidMount() {
		toast.success("Loaded");
	}
	render() {
		return (
			<div className="main-container">
				<ToastContainer />
				<Navbar />
				<div className="main-content">
					<Chat />
				</div>
			</div>
		);
	}
}

export default App;
