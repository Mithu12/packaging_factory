import crypto from 'crypto';
import { MyLogger } from './new-logger';

/**
 * Generates a secure random password
 * In development environment, returns '123456' for testing convenience
 * In production, generates a secure password meeting requirements:
 * - Minimum 12 characters
 * - Contains uppercase, lowercase, numbers, and special characters
 */
export function generatePassword(): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    MyLogger.info('PasswordGenerator.generatePassword', { 
      environment: 'development',
      password: '123456 (dev mode)'
    });
    return '123456';
  }

  // Production: Generate secure password
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one character from each required set
  let password = '';
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Shuffle the password to avoid predictable pattern
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  const generatedPassword = passwordArray.join('');

  MyLogger.info('PasswordGenerator.generatePassword', { 
    environment: 'production',
    length: generatedPassword.length
  });

  return generatedPassword;
}

