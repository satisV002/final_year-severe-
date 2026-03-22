const http = require('http');

const port = process.env.PORT || 7000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', diagnostic: true }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('Diagnostic Server is UP');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Diagnostic server listening on 0.0.0.0:${port}`);
});
