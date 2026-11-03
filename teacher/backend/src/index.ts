import http from 'node:http';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(200);
  res.end(
    JSON.stringify({
      service: 'teacher-backend',
      status: 'running',
      runtime: 'node-typescript',
      endpoints: ['/', '/health']
    })
  );
});

const PORT = Number(process.env.PORT) || 8000;
server.listen(PORT, () => {
  console.log(`Teacher backend (TypeScript) running on http://localhost:${PORT}`);
});

export default server;
