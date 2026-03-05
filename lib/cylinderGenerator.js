/**
 * Secure Random Cylinder Code Generator
 * Generates unpredictable 5-character alphanumeric codes
 * Format: 2 letters + 3 numbers (e.g., GK7D2, G8JG3, KH8F2, K0F6A)
 */

/**
 * Generate secure random cylinder code
 * @returns {string} 5-character alphanumeric code
 */
function generateSecureCylinderCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const allChars = letters + numbers
  
  // Use crypto API for better randomness
  const randomValues = new Uint32Array(5)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues)
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < 5; i++) {
      randomValues[i] = Math.floor(Math.random() * 4294967296)
    }
  }
  
  let code = ''
  
  // Generate completely random 5-character code
  // Each position can be either letter or number
  for (let i = 0; i < 5; i++) {
    const charIndex = randomValues[i] % allChars.length
    code += allChars[charIndex]
  }
  
  return code
}

/**
 * Generate multiple unique cylinder codes
 * @param {number} count - Number of codes to generate
 * @returns {string[]} Array of unique cylinder codes
 */
function generateMultipleCylinderCodes(count) {
  const codes = new Set()
  
  while (codes.size < count) {
    const code = generateSecureCylinderCode()
    codes.add(code)
  }
  
  return Array.from(codes)
}

/**
 * Validate cylinder code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid format
 */
function validateCylinderCode(code) {
  // Must be exactly 5 characters
  if (!code || code.length !== 5) return false
  
  // Must be alphanumeric only
  const alphanumeric = /^[A-Z0-9]+$/
  if (!alphanumeric.test(code)) return false
  
  // Must have at least 2 letters and 2 numbers
  const letterCount = (code.match(/[A-Z]/g) || []).length
  const numberCount = (code.match(/[0-9]/g) || []).length
  
  return letterCount >= 2 && numberCount >= 2
}

/**
 * Generate cylinder codes for seeding
 * @param {number} startCount - Starting number
 * @param {number} totalCount - Total cylinders needed
 * @returns {Array} Array of cylinder objects
 */
function generateSeedCylinders(startCount = 1, totalCount = 50) {
  const cylinders = []
  const codes = generateMultipleCylinderCodes(totalCount)
  
  for (let i = 0; i < totalCount; i++) {
    const code = codes[i]
    const isLinked = i < startCount // First few are linked to demo users
    
    cylinders.push({
      id: code,
      size: isLinked ? [12.5, 5, 12.5, 25][i % 4] : 0,
      isLinked: isLinked
    })
  }
  
  return cylinders
}

module.exports = {
  generateSecureCylinderCode,
  generateMultipleCylinderCodes,
  validateCylinderCode,
  generateSeedCylinders
}
