const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  
  if (req.url === '/v1/health') {
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.end(JSON.stringify({ message: 'OmniLaze Backend Test Server', timestamp: new Date().toISOString() }));
  }
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
});

// Keep alive
setInterval(() => {
  console.log(`${new Date().toISOString()} - Server alive`);
}, 30000);
