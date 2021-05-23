import React from "react";

import "./navbar.css";

const Navbar = () => {
	return (
		<div className="nav-main">
			<div className="nav-item">
				<b>Bak Bak</b>
			</div>
			<div className="nav-item">
				<a href="http://www.github.com/chetanbohra26">
					<img src="github.svg" alt="" />
				</a>
			</div>
		</div>
	);
};

export default Navbar;
