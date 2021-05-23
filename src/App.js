import React, { Component } from "react";

import Navbar from "./components/navbar/navbar";
import Chat from "./components/chat/chat";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";
import "./App.css";

class App extends Component {
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
