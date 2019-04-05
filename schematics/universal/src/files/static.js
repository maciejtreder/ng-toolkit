const express = require('express');

const app = express();

app.use(express.static('./dist/static'));

console.log('Listening on localhost:8080');
app.listen(8080);