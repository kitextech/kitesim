const path = require('path');

module.exports = [{
    mode: "development",
    entry: "./src/programs/index.ts",
    output: {
        path: path.resolve(__dirname, 'docs'), // string,
        filename: "bundle.js"
    },
    resolve: {
        extensions: [".ts", ".js", ".json"]
    },
    module: {
        rules: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            { use: ["ts-loader"], exclude: /node_modules/ }
        ]
    },
    watch: true
}]