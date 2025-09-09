# Modal Rendszer Frissítési Útmutató

## Új Modal Rendszer Tulajdonságai

✅ **Automatikus háttér scroll blokkolás** - Modal nyitásakor a háttér nem scrollozható
✅ **PWA optimalizált** - iPhone 12 és kis képernyőkre optimalizált
✅ **Egységes z-index kezelés** - Hierarchikus modal rendszer
✅ **Touch-friendly** - Mobil eszközökre optimalizált interakciók
✅ **Accessibility támogatás** - Screen reader és keyboard navigáció

## Hogyan frissítsd a meglévő modal komponenseket:

### 1. Import-ok hozzáadása:
```jsx
import Modal, { ModalBody, ModalFooter, ModalActions } from './common/Modal';
// vagy relatív útvonal szerint: '../common/Modal'
```

### 2. Régi modal struktúra:
```jsx
// RÉGI - ne használd
return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title">Cím</h2>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="modal-body">
        {/* tartalom */}
      </div>
      <div className="modal-footer">
        <div className="modal-actions">
          {/* gombok */}
        </div>
      </div>
    </div>
  </div>
);
```

### 3. Új modal struktúra:
```jsx
// ÚJ - használd ezt
return (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title="Cím"
    zIndex={MODAL_Z_INDEX.BASE} // opcionális
  >
    <ModalBody>
      {/* tartalom */}
    </ModalBody>
    
    <ModalFooter>
      <ModalActions>
        {/* gombok */}
      </ModalActions>
    </ModalFooter>
  </Modal>
);
```

## Z-Index Hierarchia:

- `MODAL_Z_INDEX.BASE` (2500) - Alapvető modálok
- `MODAL_Z_INDEX.ELEVATED` (2600) - Fontosabb modálok  
- `MODAL_Z_INDEX.CRITICAL` (2700) - Kritikus modálok (törlés megerősítés)
- `MODAL_Z_INDEX.PWA_INSTALL` (10000) - PWA telepítési overlay
- `MODAL_Z_INDEX.PWA_INSTRUCTIONS` (10001) - PWA instrukciók

## Frissítendő Modal Komponensek:

1. ✅ UserModal.jsx - KÉSZ
2. ⏳ AccountModal.jsx
3. ⏳ TransactionModal.jsx
4. ⏳ CategoryModal.jsx
5. ⏳ CalendarModal.jsx
6. ⏳ TransferModal.jsx
7. ⏳ RecurringRuleModal.jsx
8. ⏳ TaskModal.jsx
9. ⏳ CloseGoalModal.jsx
10. ⏳ ProfileEditModal.jsx
11. ⏳ CreateAssignmentModal.jsx
12. ⏳ EventDetailModal.jsx
13. ⏳ CreateWishModal.jsx
14. ⏳ CreateTemplateModal.jsx
15. ⏳ AssignGoalModal.jsx
16. ⏳ ApprovalModal.jsx
17. ⏳ AssignmentStatusModal.jsx
18. ⏳ EditTemplateModal.jsx
19. ⏳ ExpectedExpenseModal.jsx
20. ⏳ ExpectedExpenseCompleteModal.jsx

## CSS Előnyök:

- Automatikus scroll blokkolás
- iPhone 12 optimalizált méretezés
- Smooth touch scrolling a modal tartalmában
- PWA safe area támogatás
- Rubber band effect megakadályozása iOS-en
- Touch action optimalizálás

## Tesztelési Prioritások:

1. **iPhone 12** (390x844) - Fő céleszköz
2. **Kis Android telefonok** (360px szélesség)
3. **Tablet módok** (landscape/portrait)
4. **Desktop böngészők**
5. **PWA standalone mód**
