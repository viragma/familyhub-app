// FormField.jsx - Universal input component with 18 types
import React, { useState, useRef, useEffect } from 'react';
import './FormField.css';

const FormField = ({
  // Basic props
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  
  // Labels and descriptions
  label,
  placeholder,
  subtitle,
  helpText,
  
  // Validation
  error,
  warning,
  required = false,
  disabled = false,
  readonly = false,
  
  // Size and appearance
  size = 'medium', // small, medium, large
  variant = 'default', // default, filled, outlined
  icon,
  rightIcon,
  
  // Type-specific props
  options = [], // for select, radio, checkbox-group
  multiple = false, // for select, file
  min,
  max,
  step,
  rows = 3, // for textarea
  accept, // for file
  pattern,
  maxLength,
  
  // Advanced props
  autoComplete,
  autoFocus = false,
  debounceMs = 0,
  formatValue,
  parseValue,
  mask,
  
  // Additional props
  className = '',
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced onChange
  useEffect(() => {
    if (debounceMs > 0) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange?.(internalValue);
      }, debounceMs);
    }
  }, [internalValue, debounceMs, onChange]);

  // Handle input change
  const handleChange = (newValue) => {
    let processedValue = newValue;
    
    // Apply mask if provided
    if (mask && typeof mask === 'function') {
      processedValue = mask(processedValue);
    }
    
    // Apply parseValue if provided
    if (parseValue && typeof parseValue === 'function') {
      processedValue = parseValue(processedValue);
    }
    
    if (debounceMs > 0) {
      setInternalValue(processedValue);
    } else {
      onChange?.(processedValue);
    }
  };

  // Handle focus events
  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  // Format display value
  const getDisplayValue = () => {
    const currentValue = debounceMs > 0 ? internalValue : value;
    
    if (formatValue && typeof formatValue === 'function') {
      return formatValue(currentValue);
    }
    
    return currentValue || '';
  };

  // Generate field classes
  const getFieldClasses = () => {
    const classes = ['form-field', `form-field--${type}`, `form-field--${size}`, `form-field--${variant}`];
    
    if (focused) classes.push('form-field--focused');
    if (error) classes.push('form-field--error');
    if (warning) classes.push('form-field--warning');
    if (disabled) classes.push('form-field--disabled');
    if (readonly) classes.push('form-field--readonly');
    if (required) classes.push('form-field--required');
    if (className) classes.push(className);
    
    return classes.join(' ');
  };

  // Render different input types
  const renderInput = () => {
    const baseProps = {
      ref: inputRef,
      name,
      disabled,
      readOnly: readonly,
      required,
      autoComplete,
      autoFocus,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown,
      className: 'form-field__input',
      ...rest
    };

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return (
          <input
            {...baseProps}
            type={type}
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            pattern={pattern}
            maxLength={maxLength}
          />
        );

      case 'password':
        return (
          <div className="form-field__password-wrapper">
            <input
              {...baseProps}
              type={showPassword ? 'text' : 'password'}
              value={getDisplayValue()}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
            />
            <button
              type="button"
              className="form-field__password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        );

      case 'number':
        return (
          <input
            {...baseProps}
            type="number"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
          />
        );

      case 'range':
        return (
          <div className="form-field__range-wrapper">
            <input
              {...baseProps}
              type="range"
              value={getDisplayValue()}
              onChange={(e) => handleChange(e.target.value)}
              min={min}
              max={max}
              step={step}
            />
            <div className="form-field__range-value">{getDisplayValue()}</div>
          </div>
        );

      case 'date':
      case 'datetime-local':
      case 'time':
        return (
          <input
            {...baseProps}
            type={type}
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            min={min}
            max={max}
          />
        );

      case 'color':
        return (
          <div className="form-field__color-wrapper">
            <input
              {...baseProps}
              type="color"
              value={getDisplayValue() || '#000000'}
              onChange={(e) => handleChange(e.target.value)}
            />
            <span className="form-field__color-value">{getDisplayValue()}</span>
          </div>
        );

      case 'file':
        return (
          <input
            {...baseProps}
            type="file"
            onChange={(e) => handleChange(multiple ? e.target.files : e.target.files[0])}
            multiple={multiple}
            accept={accept}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...baseProps}
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
          />
        );

      case 'select':
        return (
          <select
            {...baseProps}
            value={getDisplayValue()}
            onChange={(e) => {
              const selectedValue = multiple 
                ? Array.from(e.target.selectedOptions, option => option.value)
                : e.target.value;
              handleChange(selectedValue);
            }}
            multiple={multiple}
          >
            {placeholder && !multiple && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="form-field__checkbox-wrapper">
            <input
              {...baseProps}
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span className="form-field__checkbox-checkmark"></span>
            <span className="form-field__checkbox-label">{label}</span>
          </label>
        );

      case 'checkbox-group':
        return (
          <div className="form-field__checkbox-group">
            {options.map((option, index) => (
              <label key={index} className="form-field__checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value || option)}
                  onChange={(e) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    const optionValue = option.value || option;
                    
                    if (e.target.checked) {
                      handleChange([...currentArray, optionValue]);
                    } else {
                      handleChange(currentArray.filter(v => v !== optionValue));
                    }
                  }}
                  disabled={disabled}
                />
                <span className="form-field__checkbox-checkmark"></span>
                <span className="form-field__checkbox-label">{option.label || option}</span>
              </label>
            ))}
          </div>
        );

      case 'radio':
        return (
          <div className="form-field__radio-group">
            {options.map((option, index) => (
              <label key={index} className="form-field__radio-wrapper">
                <input
                  type="radio"
                  name={name}
                  value={option.value || option}
                  checked={value === (option.value || option)}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={disabled}
                />
                <span className="form-field__radio-checkmark"></span>
                <span className="form-field__radio-label">{option.label || option}</span>
              </label>
            ))}
          </div>
        );

      case 'switch':
        return (
          <label className="form-field__switch-wrapper">
            <input
              {...baseProps}
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span className="form-field__switch-slider"></span>
            {label && <span className="form-field__switch-label">{label}</span>}
          </label>
        );

      case 'tags':
        return (
          <div className="form-field__tags-wrapper">
            <div className="form-field__tags">
              {Array.isArray(value) && value.map((tag, index) => (
                <span key={index} className="form-field__tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const newTags = value.filter((_, i) => i !== index);
                      handleChange(newTags);
                    }}
                    className="form-field__tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              {...baseProps}
              type="text"
              placeholder={placeholder || "Add tag and press Enter"}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  const currentTags = Array.isArray(value) ? value : [];
                  if (!currentTags.includes(e.target.value.trim())) {
                    handleChange([...currentTags, e.target.value.trim()]);
                  }
                  e.target.value = '';
                }
                onKeyDown?.(e);
              }}
            />
          </div>
        );

      case 'rating':
        const maxRating = max || 5;
        return (
          <div className="form-field__rating">
            {[...Array(maxRating)].map((_, index) => (
              <button
                key={index}
                type="button"
                className={`form-field__star ${index < (value || 0) ? 'form-field__star--filled' : ''}`}
                onClick={() => handleChange(index + 1)}
                disabled={disabled}
              >
                ⭐
              </button>
            ))}
          </div>
        );

      case 'search':
        return (
          <div className="form-field__search-wrapper">
            <input
              {...baseProps}
              type="text"
              value={getDisplayValue()}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder || "Search..."}
            />
            <span className="form-field__search-icon">🔍</span>
          </div>
        );

      default:
        return (
          <input
            {...baseProps}
            type="text"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <div className={getFieldClasses()}>
      {/* Label */}
      {label && !['checkbox', 'switch'].includes(type) && (
        <label className="form-field__label" htmlFor={name}>
          {icon && <span className="form-field__label-icon">{icon}</span>}
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
      )}
      
      {/* Subtitle */}
      {subtitle && (
        <div className="form-field__subtitle">{subtitle}</div>
      )}
      
      {/* Input Container */}
      <div className="form-field__container">
        {icon && !['checkbox', 'radio', 'switch', 'file'].includes(type) && (
          <span className="form-field__icon form-field__icon--left">{icon}</span>
        )}
        
        {renderInput()}
        
        {rightIcon && (
          <span className="form-field__icon form-field__icon--right">{rightIcon}</span>
        )}
      </div>
      
      {/* Help Text */}
      {helpText && (
        <div className="form-field__help">{helpText}</div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="form-field__error">
          {typeof error === 'string' 
            ? error 
            : typeof error === 'object' && error.message 
              ? error.message 
              : 'Érvénytelen érték'
          }
        </div>
      )}
      
      {/* Warning Message */}
      {warning && (
        <div className="form-field__warning">
          {typeof warning === 'string' 
            ? warning 
            : typeof warning === 'object' && warning.message 
              ? warning.message 
              : 'Figyelmeztetés'
          }
        </div>
      )}
    </div>
  );
};

// Pre-configured common field types
export const TextField = (props) => <FormField type="text" {...props} />;
export const EmailField = (props) => <FormField type="email" {...props} />;
export const PasswordField = (props) => <FormField type="password" {...props} />;
export const NumberField = (props) => <FormField type="number" {...props} />;
export const DateField = (props) => <FormField type="date" {...props} />;
export const SelectField = (props) => <FormField type="select" {...props} />;
export const TextareaField = (props) => <FormField type="textarea" {...props} />;
export const CheckboxField = (props) => <FormField type="checkbox" {...props} />;
export const RadioField = (props) => <FormField type="radio" {...props} />;
export const SwitchField = (props) => <FormField type="switch" {...props} />;
export const FileField = (props) => <FormField type="file" {...props} />;
export const SearchField = (props) => <FormField type="search" {...props} />;
export const TagsField = (props) => <FormField type="tags" {...props} />;
export const RatingField = (props) => <FormField type="rating" {...props} />;
export const RangeField = (props) => <FormField type="range" {...props} />;
export const ColorField = (props) => <FormField type="color" {...props} />;

export default FormField;
