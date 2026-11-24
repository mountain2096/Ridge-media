import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, '..', '')
  const target = `http://localhost:${process.env.PORT || PORT || 5000}`
  return {
    envDir: "..",
    plugins: [react()],
    server: {
      allowedHosts: ['.trycloudflare.com'],
      proxy: {
        '/api': target,
        '/uploads': target,
        '/socket.io': { target, ws: true },
      },
    },
  }
})
