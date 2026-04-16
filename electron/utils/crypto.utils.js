"use strict";
/**
 * Crypto Utilities - Handles cryptographic operations and password generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomPassword = generateRandomPassword;
/**
 * Generate a random password using alphanumeric characters
 * @param length The length of the password to generate
 * @returns A randomly generated password string
 */
function generateRandomPassword(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
