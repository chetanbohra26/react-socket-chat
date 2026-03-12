import React from "react";

import "./navbar.css";

const Navbar = () => {
	return (
		<div className="nav-main">
			<div className="nav-brand">
				<div className="nav-brand-icon">💬</div>
				<span className="nav-brand-title">Bak Bak</span>
			</div>
			<div className="nav-status">
				<div className="nav-status-dot" />
				<span>Online</span>
			</div>
			<div className="nav-actions">
				<a
					href="http://www.github.com/chetanbohra26"
					className="nav-github-link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<img src="github.svg" alt="GitHub" />
				</a>
			</div>
		</div>
	);
};

export default Navbar;
