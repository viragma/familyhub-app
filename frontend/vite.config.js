import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ez a kulcsfontosságú beállítás:
    // Bármilyen 404-es hibára végződő kérést visszairányít az index.html-re.
    // Így a React Router át tudja venni az irányítást.
    historyApiFallback: true,

    // Ezek a beállítások hasznosak a hálózati fejlesztéshez
    host: '0.0.0.0', // Elérhetővé teszi a szervert a helyi hálózaton
    port: 5173,      // A port, amin a frontend fut
  }
})