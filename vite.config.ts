import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { syncAndDeploy, addManualDonation } from './scripts/syncAndDeploy.js';

export default defineConfig({
  base: '/donationsKPI/',
  plugins: [
    react(),
    {
      name: 'vipps-sync-middleware',
      configureServer(server) {
        server.middlewares.use('/api/sync-donations', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          try {
            console.log('⚡ [Vite Server] Modtog anmodning om sync med MobilePay & deploy til GitHub...');
            const result = await syncAndDeploy();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('❌ [Vite Server] Fejl under synkronisering:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Ukendt fejl' }));
          }
        });

        server.middlewares.use('/api/manual-donation', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const donation = JSON.parse(body);
              console.log('⚡ [Vite Server] Modtog manuel donation & deploy til GitHub...', donation);
              const result = await addManualDonation(donation);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('❌ [Vite Server] Fejl ved manuel donation:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Ukendt fejl' }));
            }
          });
        });
      },
    },
  ],

  server: {
    port: 5176,
    host: true,
  },
});

