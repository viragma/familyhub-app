import React from 'react';
import { useModalManager, MODAL_Z_INDEX } from '../../hooks/useModalManager';
import './UniversalModal.css';

/**
 * Universal Modal System - Egységes modal wrapper
 * iPhone 12 optimalizált, PWA-ready
 * Automatikus háttér scroll blokkolás
 */
const UniversalModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  subtitle,
  size = 'medium',          // small, medium, large, fullscreen
  priority = 'base',        // base, elevated, critical
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
  loading = false,
  actions = null
}) => {
  const zIndex = MODAL_Z_INDEX[priority.toUpperCase()] || MODAL_Z_INDEX.BASE;
  const { modalOverlayProps, modalContentProps } = useModalManager(isOpen, zIndex);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const sizeClasses = {
    small: 'modal-size-small',
    medium: 'modal-size-medium', 
    large: 'modal-size-large',
    fullscreen: 'modal-size-fullscreen'
  };

  const priorityClasses = {
    base: 'modal-priority-base',
    elevated: 'modal-priority-elevated',
    critical: 'modal-priority-critical'
  };

  return (
    <div 
      className={`universal-modal-overlay ${priorityClasses[priority]} ${className}`}
      {...modalOverlayProps}
      onClick={handleOverlayClick}
    >
      <div 
        className={`universal-modal-content ${sizeClasses[size]} ${loading ? 'loading' : ''}`}
        {...modalContentProps}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="universal-modal-header">
            <div className="modal-title-section">
              {title && <h2 className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button 
                className="modal-close-btn" 
                onClick={onClose}
                disabled={loading}
                aria-label="Bezárás"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="universal-modal-body">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="universal-modal-footer">
            {actions}
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="modal-loading-overlay">
            <div className="loading-spinner"></div>
            <p>Mentés folyamatban...</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Modal Section - Szekciókba rendezhető tartalom
 */
export const ModalSection = ({ 
  title, 
  icon, 
  children, 
  collapsible = false, 
  defaultOpen = true,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={`modal-section ${className} ${isOpen ? 'open' : 'closed'}`}>
      {title && (
        <div 
          className={`modal-section-header ${collapsible ? 'clickable' : ''}`}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          {icon && <span className="section-icon">{icon}</span>}
          <h3 className="section-title">{title}</h3>
          {collapsible && (
            <span className={`collapse-arrow ${isOpen ? 'open' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          )}
        </div>
      )}
      {isOpen && (
        <div className="modal-section-content">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Modal Actions - Gomb terület
 */
export const ModalActions = ({ 
  children, 
  alignment = 'right', // left, center, right, space-between
  className = '' 
}) => (
  <div className={`modal-actions align-${alignment} ${className}`}>
    {children}
  </div>
);

export default UniversalModal;
