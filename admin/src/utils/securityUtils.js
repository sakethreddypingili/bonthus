/**
 * Security Utilities - Input Validation & Sanitization
 * Use these functions to prevent XSS, injection attacks, and data validation issues
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim() || '');
};

/**
 * Validates Indian mobile phone number
 * Must start with 6-9 and be exactly 10 digits
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export const validatePhoneNumber = (phone) => {
  return /^[6-9]\d{9}$/.test(phone?.trim() || '');
};

/**
 * Validates password strength
 * Must be at least 12 characters with mixed case, numbers, and symbols
 * @param {string} password - Password to validate
 * @returns {object} { isValid, errors: [] }
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[@#$%^&*!]/.test(password)) {
    errors.push('Password must contain special characters (@#$%^&*!)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
/**
 * Validates if a string is a valid UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
};

/**
 * Sanitizes HTML to prevent XSS attacks
...
 * Only allows safe text content, removes all HTML tags
 * @param {string} str - String to sanitize
 * @returns {string}
 */
export const sanitizeHTML = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Escapes special characters that could be used in injection attacks
 * @param {string} str - String to escape
 * @returns {string}
 */
export const escapeSpecialChars = (str) => {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'\/]/g, (char) => map[char]);
};

/**
 * Validates and sanitizes user input
 * Combines validation and sanitization
 * @param {string} input - User input
 * @param {string} type - Type of input: 'email', 'phone', 'name', 'text'
 * @returns {object} { isValid, value, error }
 */
export const validateAndSanitizeInput = (input, type = 'text') => {
  const sanitized = sanitizeHTML(input?.trim() || '');
  
  switch (type) {
    case 'email':
      return {
        isValid: validateEmail(sanitized),
        value: sanitized.toLowerCase(),
        error: !validateEmail(sanitized) ? 'Invalid email format' : null
      };
    case 'phone':
      return {
        isValid: validatePhoneNumber(sanitized),
        value: sanitized.replace(/\D/g, '').slice(-10),
        error: !validatePhoneNumber(sanitized) ? 'Invalid phone number (must be 10 digits starting with 6-9)' : null
      };
    case 'password':
      const passValidation = validatePassword(sanitized);
      return {
        isValid: passValidation.isValid,
        value: sanitized,
        error: passValidation.errors.length > 0 ? passValidation.errors[0] : null
      };
    case 'name':
      return {
        isValid: sanitized.length >= 2 && sanitized.length <= 100,
        value: sanitized,
        error: sanitized.length < 2 ? 'Name must be at least 2 characters' : 
               sanitized.length > 100 ? 'Name must be less than 100 characters' : null
      };
    default:
      return {
        isValid: sanitized.length > 0,
        value: sanitized,
        error: sanitized.length === 0 ? 'Input cannot be empty' : null
      };
  }
};

/**
 * Generates a secure random password
 * 16 characters with uppercase, lowercase, numbers, and symbols
 * @returns {string}
 */
export const generateSecurePassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '@#$%^&*!';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  for (let i = 4; i < 16; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Never log sensitive data
 * Use this to create safe error messages
 * @param {Error} error - Error object
 * @returns {string} Safe error message
 */
export const getSafeErrorMessage = (error) => {
  // Don't expose database errors or sensitive info
  const message = error?.message || 'An error occurred';
  
  // List of safe messages to show user
  const safeMessages = {
    'Email already exists': 'Email already exists',
    'Phone number already exists': 'Phone number already exists',
    'Invalid email format': 'Invalid email format',
    'Phone must be a valid 10-digit Indian number': 'Invalid phone number',
    'Password must be at least 12 characters': 'Password too short',
  };
  
  // Check if error message is in safe list
  for (const [key, value] of Object.entries(safeMessages)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  // Default safe message for unknown errors
  console.error('SENSITIVE ERROR (not shown to user):', error);
  return 'An error occurred. Please try again.';
};

/**
 * Validates that user has required permission
 * @param {object} userProfile - User profile object
 * @param {string} requiredRole - Required role: 'admin', 'super_admin', 'employee'
 * @returns {boolean}
 */
export const hasPermission = (userProfile, requiredRole) => {
  if (!userProfile) return false;
  
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'employee': 1,
    'user': 0
  };
  
  const userLevel = roleHierarchy[userProfile.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};
