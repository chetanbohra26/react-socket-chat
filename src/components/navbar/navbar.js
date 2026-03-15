const Navbar = ({ isOnline, isDark, onToggle }) => {
	return (
		<nav className='flex items-center justify-between px-4 py-3 bg-indigo-600 shadow-md'>
			<div className='flex items-center gap-2'>
				<div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg'>
					💬
				</div>
				<span className='text-white font-semibold text-lg tracking-tight'>
					Bak Bak
				</span>
			</div>

			<div className='flex items-center gap-1.5'>
				<span
					className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 status-pulse' : 'bg-slate-400'}`}
				/>
				<span className='text-indigo-100 text-sm font-medium'>
					{isOnline ? 'Online' : 'Offline'}
				</span>
			</div>

			<div className='flex items-center gap-2'>
				<button
					type='button'
					onClick={onToggle}
					className='w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center transition text-base'
					title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{isDark ? '☀️' : '🌙'}
				</button>
				<a
					href='https://www.github.com/chetanbohra26'
					target='_blank'
					rel='noopener noreferrer'
					className='w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center transition'
					title='GitHub'
				>
					<img src='github.svg' alt='GitHub' className='w-5 h-5 invert' />
				</a>
			</div>
		</nav>
	);
};

export default Navbar;
