import React, { useState, useEffect } from 'react';

import Navbar from './components/navbar/navbar';
import Chat from './components/chat/chat';

import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.min.css';

const App = () => {
	const [isOnline, setIsOnline] = useState(false);
	const [isDark, setIsDark] = useState(
		() => localStorage.getItem('theme') !== 'light',
	);

	useEffect(() => {
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}, [isDark]);

	return (
		<div className={`flex flex-col h-screen bg-slate-100 dark:bg-slate-900 ${isDark ? 'dark' : ''}`}>
			<ToastContainer
				position='top-right'
				autoClose={3000}
				hideProgressBar={false}
			/>
			<Navbar isOnline={isOnline} isDark={isDark} onToggle={() => setIsDark((d) => !d)} />
			<div className='flex flex-1 overflow-hidden'>
				<Chat setIsOnline={setIsOnline} />
			</div>
		</div>
	);
};

export default App;
