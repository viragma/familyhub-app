# FamilyHub - Hálózati Hozzáférés

## Elérhető Címek

### Frontend (PWA Alkalmazás)
- **Helyi hálózat**: http://192.168.1.6:4173
- **VPN**: http://100.109.70.114:4173
- **Docker bridge**: http://172.18.0.1:4173
- **Localhost**: http://localhost:4173

### Backend API
- **Helyi hálózat**: http://192.168.1.6:8000
- **VPN**: http://100.109.70.114:8000
- **Docker bridge**: http://172.18.0.1:8000
- **Localhost**: http://localhost:8000

## Hálózati Konfiguráció

### Tűzfal Beállítások (UFW)
```bash
# Engedélyezett portok:
- 4173/tcp: PWA frontend preview szerver
- 5173/tcp: PWA frontend dev szerver  
- 8000/tcp: FastAPI backend
- 5432/tcp: PostgreSQL adatbázis
```

### Vite Konfiguráció
```javascript
// vite.config.js
server: {
  host: true,  // Minden hálózati interfészen elérhető
  port: 5173
},
preview: {
  host: true,  // Minden hálózati interfészen elérhető  
  port: 4173
}
```

### Frontend API Konfiguráció
```javascript
// Dinamikus API URL beállítás
const apiUrl = `http://${window.location.hostname}:8000`;
```

## Telepítés és Használat

### PWA Telepítés
1. Nyisd meg a böngészőt (Chrome/Safari)
2. Navigálj a címre:
   - Helyi hálózatról: http://192.168.1.6:4173
   - VPN-ről: http://100.109.70.114:4173
3. Chrome: "Telepítés" gomb / Safari: "Hozzáadás a kezdőképernyőhöz"

### Rendszerkövetelmények
- **Android**: Chrome 70+ 
- **iOS**: Safari 11.1+
- **Desktop**: Chrome 70+, Firefox 79+, Edge 79+

## Biztonsági Megjegyzések

- Az alkalmazás HTTP protokollt használ (nem HTTPS)
- Belső hálózati és VPN használatra optimalizált
- Külső internet hozzáféréshez SSL tanúsítvány szükséges

## Hibaelhárítás

### Connection Refused hiba
1. Ellenőrizd hogy a szerver fut: `ps aux | grep vite`
2. Ellenőrizd a tűzfal beállításokat: `sudo ufw status`
3. Teszteld a helyi kapcsolatot: `curl -I http://localhost:4173`

### Backend kapcsolati problémák
1. Ellenőrizd a backend státuszt: `ps aux | grep python`
2. Teszteld az API-t: `curl -I http://localhost:8000/docs`
3. Ellenőrizd a 8000-es portot: `netstat -tlnp | grep :8000`

## Szerver Indítás

```bash
# Frontend (PWA)
cd frontend
npm run build  # Építés
npm run preview  # Éles szerver indítása

# Backend (FastAPI)
cd backend  
uvicorn main:app --host 0.0.0.0 --port 8000
```
