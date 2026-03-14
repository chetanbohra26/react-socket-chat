import React, { useState } from "react";

import Navbar from "./components/navbar/navbar";
import Chat from "./components/chat/chat";

import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.min.css";

const App = () => {
	const [isOnline, setIsOnline] = useState(false);

	return (
		<div className="flex flex-col h-screen bg-slate-100">
			<ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
			<Navbar isOnline={isOnline} />
			<div className="flex flex-1 overflow-hidden">
				<Chat setIsOnline={setIsOnline} />
			</div>
		</div>
	);
};

export default App;
