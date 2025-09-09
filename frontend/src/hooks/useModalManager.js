import { useEffect } from 'react';

/**
 * Modal kezelő hook - kezeli a háttér scroll blokkolását és z-index hierarchiát
 * @param {boolean} isOpen - Modal nyitott állapota
 * @param {number} zIndex - Modal z-index értéke (alapértelmezett: 2500)
 */
export const useModalManager = (isOpen, zIndex = 2500) => {
  useEffect(() => {
    if (isOpen) {
      // Háttér scroll blokkolása
      const originalStyle = window.getComputedStyle(document.body).overflow;
      const originalPosition = window.getComputedStyle(document.body).position;
      const scrollY = window.scrollY;
      
      // Rögzítjük a jelenlegi scroll pozíciót
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // PWA safe area support
      if (CSS.supports('padding', 'env(safe-area-inset-left)')) {
        document.body.style.paddingLeft = 'env(safe-area-inset-left)';
        document.body.style.paddingRight = 'env(safe-area-inset-right)';
      }
      
      // Cleanup function
      return () => {
        // Visszaállítjuk az eredeti állapotot
        document.body.style.overflow = originalStyle;
        document.body.style.position = originalPosition;
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingLeft = '';
        document.body.style.paddingRight = '';
        
        // Visszaállítjuk a scroll pozíciót
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
  
  // Modal specifikus beállítások visszaadása
  return {
    modalOverlayProps: {
      style: {
        zIndex,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden', // Blokkolja a modal overlay scrollolását is
      }
    },
    modalContentProps: {
      style: {
        zIndex: zIndex + 1,
        position: 'relative',
      }
    }
  };
};

/**
 * Modal z-index konstansok - hierarchikus rendszer
 */
export const MODAL_Z_INDEX = {
  BASE: 2500,           // Alapvető modálok
  ELEVATED: 2600,       // Fontosabb modálok
  CRITICAL: 2700,       // Kritikus modálok (pl. törlés megerősítés)
  PWA_INSTALL: 10000,   // PWA telepítési overlay
  PWA_INSTRUCTIONS: 10001, // PWA instrukciók
};

/**
 * Mobil optimalizált modal méret kalkulátor
 * @param {number} contentHeight - Modal tartalom becsült magassága
 * @returns {object} - CSS tulajdonságok mobilra
 */
export const calculateMobileModalSize = (contentHeight = 0) => {
  const isMobile = window.innerWidth <= 480;
  const isSmallMobile = window.innerWidth <= 360;
  const viewportHeight = window.innerHeight;
  
  if (isSmallMobile) {
    return {
      maxHeight: '78vh',
      padding: '0.25rem 0.25rem 5.5rem 0.25rem',
      margin: '0.5rem 0',
      bodyMaxHeight: 'calc(65vh - 100px)',
    };
  }
  
  if (isMobile) {
    return {
      maxHeight: '85vh',
      padding: '0.5rem 0.5rem 6rem 0.5rem',
      margin: '1rem 0',
      bodyMaxHeight: 'calc(75vh - 120px)',
    };
  }
  
  // Desktop
  return {
    maxHeight: '85vh',
    padding: 'max(5rem, env(safe-area-inset-top)) 1rem 1rem 1rem',
    margin: '0',
    bodyMaxHeight: 'calc(85vh - 140px)',
  };
};
