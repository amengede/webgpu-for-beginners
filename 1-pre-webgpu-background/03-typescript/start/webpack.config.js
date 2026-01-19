const path = require("path");
module.exports = {
    entry: "./src/hex-verter/main.js",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist")
    }
}