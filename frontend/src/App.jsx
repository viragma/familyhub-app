import React from 'react';
import './index.css';
import Nav from './components/Nav'; // Importáljuk az új komponenst

function App() {
  return (
    <div>
      <Nav /> {/* Meghívjuk a komponenst */}
      <div className="container">
        {/* Ide jön majd az üdvözlő fejléc */}
        {/* Ide jön majd a "Bento Grid" a kártyákkal */}
      </div>
    </div>
  );
}

export default App;