import React from "react";

import Navbar from "./components/navbar/navbar";
import Chat from "./components/chat/chat";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";
import "./App.css";

const App = () => {
	return (
		<div className="main-container">
			<ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
			<Navbar />
			<div className="main-content">
				<Chat />
			</div>
		</div>
	);
};

export default App;
