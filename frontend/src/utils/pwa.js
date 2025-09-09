// PWA Utils - App Installation and PWA Management

export class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    
    this.init();
  }

  init() {
    // Disable translation globally
    document.body.classList.add('notranslate');
    document.documentElement.setAttribute('translate', 'no');
    
    // Check if app is installed
    this.checkInstallationStatus();
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA: App successfully installed');
      this.isInstalled = true;
      this.hideInstallPrompt();
    });

    // Check if app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isStandalone = true;
      document.body.classList.add('pwa-standalone');
    }

    // Listen for iOS standalone mode
    if (window.navigator.standalone === true) {
      this.isStandalone = true;
      document.body.classList.add('pwa-standalone', 'pwa-ios');
    }
  }

  checkInstallationStatus() {
    // Check if app is in standalone mode
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    
    // Check if app is installed (heuristic)
    this.isInstalled = this.isStandalone;
  }

  async showInstallDialog() {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available');
      this.showManualInstallInstructions();
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
        this.isInstalled = true;
      } else {
        console.log('PWA: User dismissed install prompt');
      }
      
      // Clear the deferred prompt
      this.deferredPrompt = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA: Error showing install prompt:', error);
      this.showManualInstallInstructions();
      return false;
    }
  }

  showInstallPrompt() {
    // Don't show if already installed
    if (this.isInstalled || this.isStandalone) {
      return;
    }

    // Create and show install prompt
    this.createInstallPrompt();
  }

  hideInstallPrompt() {
    const existingPrompt = document.getElementById('pwa-install-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }
  }

  createInstallPrompt() {
    // Remove existing prompt if any
    this.hideInstallPrompt();

    const promptDiv = document.createElement('div');
    promptDiv.id = 'pwa-install-prompt';
    promptDiv.className = 'pwa-install-prompt';
    promptDiv.innerHTML = `
      <div class="pwa-install-content">
        <h3>📱 Telepítsd az alkalmazást!</h3>
        <p>A FamilyHub telepíthető az eszközödre a jobb élmény érdekében.</p>
        <div class="pwa-install-buttons">
          <button id="pwa-install-btn" class="pwa-install-accept">Telepítés</button>
          <button id="pwa-install-dismiss" class="pwa-install-dismiss">Később</button>
        </div>
      </div>
    `;

    document.body.appendChild(promptDiv);

    // Add event listeners
    document.getElementById('pwa-install-btn').addEventListener('click', () => {
      this.showInstallDialog();
    });

    document.getElementById('pwa-install-dismiss').addEventListener('click', () => {
      this.hideInstallPrompt();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideInstallPrompt();
    }, 10000);
  }

  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        registration.update();
      }
    }
  }

  showManualInstallInstructions() {
    const platform = this.detectPlatform();
    const instructions = this.getInstallInstructions(platform);
    
    const modal = document.createElement('div');
    modal.className = 'pwa-install-modal';
    modal.innerHTML = `
      <div class="pwa-install-modal-content">
        <h3>Alkalmazás telepítése</h3>
        <div class="pwa-install-instructions">
          ${instructions}
        </div>
        <button onclick="this.parentElement.parentElement.remove()">Bezárás</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) {
      return 'android';
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/windows/.test(userAgent)) {
      return 'windows';
    } else if (/macintosh|mac os x/.test(userAgent)) {
      return 'macos';
    } else {
      return 'desktop';
    }
  }

  getInstallInstructions(platform) {
    const instructions = {
      android: `
        <h4>📱 Android Chrome:</h4>
        <ol>
          <li>Kattints a Chrome menü gombra (⋮)</li>
          <li>Válaszd a "Hozzáadás a kezdőképernyőhöz" opciót</li>
          <li>Erősítsd meg a "Hozzáadás" gombbal</li>
        </ol>
      `,
      ios: `
        <h4>📱 iPhone/iPad Safari:</h4>
        <ol>
          <li>Kattints a megosztás gombra (📤)</li>
          <li>Görgets le és válaszd "Hozzáadás a kezdőképernyőhöz"</li>
          <li>Erősítsd meg a "Hozzáadás" gombbal</li>
        </ol>
      `,
      desktop: `
        <h4>🖥️ Asztali böngésző:</h4>
        <ol>
          <li>Keresd a telepítés gombot a címsorban</li>
          <li>Vagy használd a böngésző menüt</li>
          <li>Chrome: Menü → "Alkalmazás telepítése"</li>
        </ol>
      `
    };

    return instructions[platform] || instructions.desktop;
  }
}

// Create and export singleton instance
export const pwaManager = new PWAManager();

// Export as default as well
export default pwaManager;
