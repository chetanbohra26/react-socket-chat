import React from "react";

import Navbar from "./components/navbar/navbar";
import Chat from "./components/chat/chat";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";

const App = () => {
	return (
		<div className="flex flex-col h-screen bg-slate-100">
			<ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
			<Navbar />
			<div className="flex flex-1 overflow-hidden">
				<Chat />
			</div>
		</div>
	);
};

export default App;
