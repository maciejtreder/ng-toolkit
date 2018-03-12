let server = require('./dist/server');
let port = process.env.PORT || 8080;

// Server
server.app.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`);
});
