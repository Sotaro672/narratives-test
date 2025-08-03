import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy-api': {
        target: 'https://narratives-api-765852113927.asia-northeast1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url || 'unknown', '-> target:', _options.target);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Proxy response:', proxyRes.statusCode, req.url || 'unknown');
          });
        }
      }
    }
  }
})
