import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';

// A .env fájl betöltése a megfelelő helyről
const envPath = path.resolve(__dirname, '.env');
const envConfig = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf-8')) : {};

function parseEnv(envContent) {
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = match[2] || '';
    }
  });
  return env;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ez a rész a lényeg!
    historyApiFallback: true,
    // Opcionális, de hasznos a hálózaton keresztüli fejlesztéshez
    host: '0.0.0.0', 
    port: 5173,
    // Ha a backend és a frontend más-más porton fut,
    // a proxy segít elkerülni a CORS hibákat.
    proxy: {
      '/api': {
        target: envConfig.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})