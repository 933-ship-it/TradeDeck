// api/serve-app.js
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const scriptPath = join(process.cwd(), 'private', 'production-app.js');

  try {
    const script = readFileSync(scriptPath, 'utf-8');

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-store');
    res.send(script);
  } catch (err) {
    res.status(500).send('Error loading script');
  }
}
