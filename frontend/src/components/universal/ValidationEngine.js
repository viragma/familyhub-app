// ValidationEngine.js - Centralized validation system
import { useState, useCallback, useMemo } from 'react';

// === VALIDATION RULES === //

export const validationRules = {
  // Required field validation
  required: (value, message = 'This field is required') => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  // String length validations
  minLength: (min, message) => (value) => {
    if (!value || value.length < min) {
      return message || `Minimum ${min} characters required`;
    }
    return null;
  },

  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return message || `Maximum ${max} characters allowed`;
    }
    return null;
  },

  // Number validations
  min: (min, message) => (value) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num < min) {
      return message || `Minimum value is ${min}`;
    }
    return null;
  },

  max: (max, message) => (value) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > max) {
      return message || `Maximum value is ${max}`;
    }
    return null;
  },

  // Email validation
  email: (value, message = 'Please enter a valid email address') => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },

  // URL validation
  url: (value, message = 'Please enter a valid URL') => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  // Phone number validation (Hungarian format)
  phone: (value, message = 'Please enter a valid phone number') => {
    if (!value) return null;
    const phoneRegex = /^(\+36|06)?[1-9][0-9]{7,8}$/;
    return phoneRegex.test(value.replace(/[\s-]/g, '')) ? null : message;
  },

  // Number validation
  number: (value, message = 'Please enter a valid number') => {
    if (!value) return null;
    return isNaN(parseFloat(value)) ? message : null;
  },

  // Integer validation
  integer: (value, message = 'Please enter a whole number') => {
    if (!value) return null;
    return Number.isInteger(parseFloat(value)) ? null : message;
  },

  // Pattern validation
  pattern: (regex, message) => (value) => {
    if (!value) return null;
    const regexObj = typeof regex === 'string' ? new RegExp(regex) : regex;
    return regexObj.test(value) ? null : message || 'Invalid format';
  },

  // Date validations
  dateAfter: (afterDate, message) => (value) => {
    if (!value) return null;
    const inputDate = new Date(value);
    const compareDate = new Date(afterDate);
    return inputDate > compareDate ? null : message || `Date must be after ${afterDate}`;
  },

  dateBefore: (beforeDate, message) => (value) => {
    if (!value) return null;
    const inputDate = new Date(value);
    const compareDate = new Date(beforeDate);
    return inputDate < compareDate ? null : message || `Date must be before ${beforeDate}`;
  },

  // File validations
  fileSize: (maxSizeInMB, message) => (file) => {
    if (!file) return null;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes ? null : message || `File size must be less than ${maxSizeInMB}MB`;
  },

  fileType: (allowedTypes, message) => (file) => {
    if (!file) return null;
    const fileType = file.type || '';
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    const isTypeAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.slice(1);
      }
      return fileType.includes(type);
    });
    
    return isTypeAllowed ? null : message || `Allowed file types: ${allowedTypes.join(', ')}`;
  },

  // Array validations
  arrayMinLength: (min, message) => (value) => {
    if (!Array.isArray(value) || value.length < min) {
      return message || `Please select at least ${min} item${min > 1 ? 's' : ''}`;
    }
    return null;
  },

  arrayMaxLength: (max, message) => (value) => {
    if (Array.isArray(value) && value.length > max) {
      return message || `Please select at most ${max} item${max > 1 ? 's' : ''}`;
    }
    return null;
  },

  // Custom validation
  custom: (validator, message) => (value) => {
    try {
      const result = validator(value);
      return result === true ? null : (result || message || 'Invalid value');
    } catch (error) {
      return message || 'Validation error';
    }
  },

  // Conditional validation
  requiredIf: (condition, message) => (value, allValues) => {
    const shouldBeRequired = typeof condition === 'function' 
      ? condition(allValues) 
      : condition;
    
    if (shouldBeRequired) {
      return validationRules.required(value, message);
    }
    return null;
  },

  // Match another field
  matchField: (fieldName, message) => (value, allValues) => {
    const otherValue = allValues[fieldName];
    return value === otherValue ? null : message || `Must match ${fieldName}`;
  }
};

// === FORM VALIDATION SCHEMA === //

export class ValidationSchema {
  constructor(schema = {}) {
    this.schema = schema;
  }

  // Add field validation
  field(fieldName, ...validators) {
    this.schema[fieldName] = validators;
    return this;
  }

  // Validate single field
  validateField(fieldName, value, allValues = {}) {
    const validators = this.schema[fieldName] || [];
    
    for (const validator of validators) {
      const error = typeof validator === 'function' 
        ? validator(value, allValues)
        : validator;
      
      if (error) {
        return error;
      }
    }
    return null;
  }

  // Validate all fields
  validateAll(values) {
    const errors = {};
    
    for (const fieldName in this.schema) {
      const error = this.validateField(fieldName, values[fieldName], values);
      if (error) {
        errors[fieldName] = error;
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }

  // Check if form is valid
  isValid(values) {
    return this.validateAll(values) === null;
  }
}

// === FORM VALIDATION HOOK === //

export const useFormValidation = (initialValues = {}, schema = null) => {
  const [values, setValuesState] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouchedState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate single field
  const validateField = useCallback((fieldName, value = values[fieldName]) => {
    if (!schema) return null;
    
    const error = schema.validateField(fieldName, value, values);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    return error;
  }, [schema, values]);

  // Validate all fields
  const validateAll = useCallback(() => {
    if (!schema) return {};
    
    const allErrors = schema.validateAll(values) || {};
    setErrors(allErrors);
    return allErrors;
  }, [schema, values]);

  // Set field value with validation
  const setValue = useCallback((fieldName, value) => {
    setValuesState(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Don't auto-validate on setValue calls to prevent loops
  }, []);

  // Set multiple values
  const setValues = useCallback((newValues) => {
    setValuesState(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  // Mark field as touched
  const setTouched = useCallback((fieldName, isTouched = true) => {
    setTouchedState(prev => ({
      ...prev,
      [fieldName]: isTouched
    }));

    // Validate when field becomes touched
    if (isTouched) {
      validateField(fieldName);
    }
  }, [validateField]);

  // Handle field change
  const handleChange = useCallback((fieldName) => (value) => {
    setValuesState(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validate if field was touched
    if (touched[fieldName] && schema) {
      setTimeout(() => {
        const error = schema.validateField(fieldName, value, values);
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
      }, 0);
    }
  }, [touched, schema, values]);

  // Handle field blur
  const handleBlur = useCallback((fieldName) => () => {
    setTouchedState(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    // Validate field on blur
    if (schema) {
      const error = schema.validateField(fieldName, values[fieldName], values);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  }, [schema, values]);

  // Submit form
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allFieldNames = Object.keys(schema?.schema || {});
    const touchedState = {};
    allFieldNames.forEach(name => {
      touchedState[name] = true;
    });
    setTouchedState(touchedState);

    // Validate all fields
    const allErrors = validateAll();
    
    if (Object.keys(allErrors).length === 0) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
    return Object.keys(allErrors).length === 0;
  }, [values, validateAll]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValuesState(newValues);
    setErrors({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Get field props for FormField components
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    onChange: handleChange(fieldName),
    onBlur: handleBlur(fieldName),
    error: touched[fieldName] ? errors[fieldName] : null
  }), [values, errors, touched]);

  // Computed properties
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const hasErrors = useMemo(() => {
    return Object.keys(errors).some(key => errors[key]);
  }, [errors]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    
    // Computed
    isValid,
    hasErrors,
    isDirty,
    
    // Actions
    setValue,
    setValues,
    setTouched,
    validateField,
    validateAll,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps
  };
};

// === PRESET VALIDATION SCHEMAS === //

export const commonSchemas = {
  // User registration schema
  registration: new ValidationSchema()
    .field('email', 
      validationRules.required,
      validationRules.email
    )
    .field('password',
      validationRules.required,
      validationRules.minLength(8, 'Password must be at least 8 characters')
    )
    .field('confirmPassword',
      validationRules.required,
      validationRules.matchField('password', 'Passwords must match')
    )
    .field('firstName',
      validationRules.required,
      validationRules.minLength(2)
    )
    .field('lastName',
      validationRules.required,
      validationRules.minLength(2)
    ),

  // Login schema
  login: new ValidationSchema()
    .field('email',
      validationRules.required,
      validationRules.email
    )
    .field('password',
      validationRules.required
    ),

  // Profile update schema
  profile: new ValidationSchema()
    .field('firstName',
      validationRules.required,
      validationRules.minLength(2)
    )
    .field('lastName',
      validationRules.required,
      validationRules.minLength(2)
    )
    .field('phone',
      validationRules.phone
    )
    .field('avatar',
      validationRules.fileType(['image/jpeg', 'image/png', 'image/webp'], 'Please upload a valid image'),
      validationRules.fileSize(5, 'Image must be less than 5MB')
    ),

  // Transaction schema
  transaction: new ValidationSchema()
    .field('amount',
      validationRules.required,
      validationRules.number,
      validationRules.min(0.01, 'Amount must be greater than 0')
    )
    .field('description',
      validationRules.required,
      validationRules.minLength(3)
    )
    .field('category',
      validationRules.required
    )
    .field('date',
      validationRules.required
    ),

  // Account schema
  account: new ValidationSchema()
    .field('name',
      validationRules.required,
      validationRules.minLength(2)
    )
    .field('type',
      validationRules.required
    )
    .field('initialBalance',
      validationRules.number,
      validationRules.min(0)
    )
    .field('goalAmount',
      (value, allValues) => {
        if (allValues.type === 'savings' && !value) {
          return 'Goal amount is required for savings accounts';
        }
        return null;
      },
      validationRules.number,
      validationRules.min(0)
    ),

  // Wish/Goal schema
  wish: new ValidationSchema()
    .field('title',
      validationRules.required,
      validationRules.minLength(3)
    )
    .field('targetAmount',
      validationRules.required,
      validationRules.number,
      validationRules.min(1)
    )
    .field('deadline',
      validationRules.required,
      validationRules.dateAfter(new Date().toISOString().split('T')[0])
    )
    .field('description',
      validationRules.maxLength(500)
    ),

  // Settings schema
  settings: new ValidationSchema()
    .field('currency',
      validationRules.required
    )
    .field('language',
      validationRules.required
    )
    .field('notifications',
      validationRules.arrayMinLength(1, 'Please select at least one notification type')
    )
};

// === UTILITY FUNCTIONS === //

// Create a schema builder
export const createSchema = () => new ValidationSchema();

// Compose validators
export const compose = (...validators) => (value, allValues) => {
  for (const validator of validators) {
    const error = validator(value, allValues);
    if (error) return error;
  }
  return null;
};

// Create conditional validator
export const when = (condition, validator) => (value, allValues) => {
  const shouldValidate = typeof condition === 'function' 
    ? condition(allValues, value)
    : condition;
  
  return shouldValidate ? validator(value, allValues) : null;
};

export default {
  validationRules,
  ValidationSchema,
  useFormValidation,
  commonSchemas,
  createSchema,
  compose,
  when
};
