import React from 'react';

// A "props" egy objektum, ami a komponensnek átadott attribútumokat tartalmazza
// A { title, icon, className, children } a "destructuring" nevű technika,
// amivel kibontjuk a props objektumból a számunkra kellő értékeket.
function BentoCard({ title, icon, className = '', children }) {
  
  // Összefűzzük az alap stílusosztályt a kívülről kapottakkal
  const cardClasses = `bento-card ${className}`;

  return (
    <div className={cardClasses}>
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <div className="card-icon">{icon}</div>
      </div>
      {/* A "children" egy speciális prop, ami a komponens nyitó és záró tag-je
          közötti tartalmat jelenti. Így bármit beletehetünk. */}
      {children}
    </div>
  );
}

export default BentoCard;