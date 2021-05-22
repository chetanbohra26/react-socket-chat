const express = require("express");

const app = express();

app.get("/", (req, res) => {
	res.send("Welcome to app");
});

const port = process.env.PORT || 7500;
app.listen(port, () => console.log(`Listening on port ${port}..!`));
