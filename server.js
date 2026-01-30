import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run provides the PORT environment variable, defaults to 8080
const port = process.env.PORT || 8080;

// Serve files from the root and the dist directory
app.use(express.static(__dirname));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// SPA Fallback: Any route not handled by static files serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Handle Cloud Run termination signals
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
  });
});
