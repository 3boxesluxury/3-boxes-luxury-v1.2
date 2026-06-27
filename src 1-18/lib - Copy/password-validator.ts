/**
 * Validates password strength against security requirements.
 * Rules: 8+ characters, uppercase, lowercase, number, special character
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least 1 uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least 1 lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least 1 number')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push('Password must contain at least 1 special character')

  return { valid: errors.length === 0, errors }
}
