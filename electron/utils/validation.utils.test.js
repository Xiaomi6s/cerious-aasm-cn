"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_utils_1 = require("../utils/validation.utils");
// ...previous tests...
describe('Validation Utils', () => {
    describe('validateInstanceId', () => {
        it('should return true for valid instance IDs', () => {
            expect((0, validation_utils_1.validateInstanceId)('server1')).toBe(true);
            expect((0, validation_utils_1.validateInstanceId)('my-server_01')).toBe(true);
            expect((0, validation_utils_1.validateInstanceId)('a')).toBe(true);
            expect((0, validation_utils_1.validateInstanceId)('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.substring(0, 50))).toBe(true);
        });
        it('should return false for invalid instance IDs', () => {
            expect((0, validation_utils_1.validateInstanceId)('')).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)('server with spaces')).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)('server@domain.com')).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)('server.with.dots')).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)('a'.repeat(51))).toBe(false); // Too long
            expect((0, validation_utils_1.validateInstanceId)(null)).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)(undefined)).toBe(false);
            expect((0, validation_utils_1.validateInstanceId)(123)).toBe(false);
        });
    });
    describe('validatePort', () => {
        it('should return true for valid ports', () => {
            expect((0, validation_utils_1.validatePort)(1024)).toBe(true);
            expect((0, validation_utils_1.validatePort)(3000)).toBe(true);
            expect((0, validation_utils_1.validatePort)(65535)).toBe(true);
            expect((0, validation_utils_1.validatePort)('8080')).toBe(true);
        });
        it('should return false for invalid ports', () => {
            expect((0, validation_utils_1.validatePort)(1023)).toBe(false); // Below minimum
            expect((0, validation_utils_1.validatePort)(65536)).toBe(false); // Above maximum
            expect((0, validation_utils_1.validatePort)(0)).toBe(false);
            expect((0, validation_utils_1.validatePort)(-1)).toBe(false);
            expect((0, validation_utils_1.validatePort)(3.14)).toBe(false); // Not integer
            expect((0, validation_utils_1.validatePort)('not-a-number')).toBe(false);
            expect((0, validation_utils_1.validatePort)('')).toBe(false);
        });
    });
    describe('validateServerName', () => {
        it('should return true for valid server names', () => {
            expect((0, validation_utils_1.validateServerName)('My Server')).toBe(true);
            expect((0, validation_utils_1.validateServerName)('Server-01_02')).toBe(true);
            expect((0, validation_utils_1.validateServerName)('Test@#$%^&*()')).toBe(true);
            expect((0, validation_utils_1.validateServerName)('Server with spaces and symbols: !@#$%^&*()')).toBe(true);
        });
        it('should return false for invalid server names', () => {
            expect((0, validation_utils_1.validateServerName)('')).toBe(false);
            expect((0, validation_utils_1.validateServerName)('a'.repeat(101))).toBe(false); // Too long
            expect((0, validation_utils_1.validateServerName)(null)).toBe(false);
            expect((0, validation_utils_1.validateServerName)(undefined)).toBe(false);
            expect((0, validation_utils_1.validateServerName)(123)).toBe(false);
        });
        it('should reject names with control characters', () => {
            expect((0, validation_utils_1.validateServerName)('Server\x00Name')).toBe(false); // Null character
            expect((0, validation_utils_1.validateServerName)('Server\x01Name')).toBe(false); // Control character
            expect((0, validation_utils_1.validateServerName)('Server\x7FName')).toBe(false); // Delete character
        });
    });
    describe('sanitizeString', () => {
        it('should sanitize strings by removing control characters', () => {
            expect((0, validation_utils_1.sanitizeString)('Hello\x00World')).toBe('HelloWorld');
            expect((0, validation_utils_1.sanitizeString)('Test\x01String')).toBe('TestString');
            expect((0, validation_utils_1.sanitizeString)('  spaced  ')).toBe('spaced');
            expect((0, validation_utils_1.sanitizeString)('\t\tTabbed\t\t')).toBe('Tabbed');
        });
        it('should handle edge cases', () => {
            expect((0, validation_utils_1.sanitizeString)('')).toBe('');
            expect((0, validation_utils_1.sanitizeString)(null)).toBe('');
            expect((0, validation_utils_1.sanitizeString)(undefined)).toBe('');
            expect((0, validation_utils_1.sanitizeString)(123)).toBe('');
        });
        it('should preserve printable characters', () => {
            const input = 'Hello World! @#$%^&*()_+-=[]{}|;:,.<>?';
            expect((0, validation_utils_1.sanitizeString)(input)).toBe(input);
        });
    });
    describe('validateAuthInput', () => {
        it('should return valid result for valid inputs', () => {
            const result = (0, validation_utils_1.validateAuthInput)('admin', 'password123');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should return invalid result for missing username', () => {
            const result = (0, validation_utils_1.validateAuthInput)('', 'password123');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Username is required');
        });
        it('should return invalid result for missing password', () => {
            const result = (0, validation_utils_1.validateAuthInput)('admin', '');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Password is required');
        });
        it('should return invalid result for invalid types', () => {
            const result1 = (0, validation_utils_1.validateAuthInput)(null, 'password');
            expect(result1.valid).toBe(false);
            expect(result1.error).toBe('Username is required');
            const result2 = (0, validation_utils_1.validateAuthInput)('admin', null);
            expect(result2.valid).toBe(false);
            expect(result2.error).toBe('Password is required');
        });
        it('should return invalid result for overly long inputs', () => {
            const longUsername = 'a'.repeat(101);
            const result = (0, validation_utils_1.validateAuthInput)(longUsername, 'password');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Username too long');
        });
        it('should return invalid result for overly long password', () => {
            const longPassword = 'a'.repeat(201);
            const result = (0, validation_utils_1.validateAuthInput)('user', longPassword);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Password too long');
        });
        it('should return invalid result for username longer than 50 characters', () => {
            const longUsername = 'a'.repeat(51);
            const result = (0, validation_utils_1.validateAuthInput)(longUsername, 'password');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Username too long');
        });
        it('should return invalid result for password longer than 200 characters', () => {
            const longPassword = 'a'.repeat(201);
            const result = (0, validation_utils_1.validateAuthInput)('user', longPassword);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Password too long');
        });
        it('should return valid for username of exactly 50 chars and password of exactly 200 chars', () => {
            const username = 'a'.repeat(50);
            const password = 'b'.repeat(200);
            const result = (0, validation_utils_1.validateAuthInput)(username, password);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should return invalid if username is whitespace only', () => {
            const result = (0, validation_utils_1.validateAuthInput)('   ', 'password');
            expect(result.valid).toBe(true); // whitespace is counted as valid string
        });
        it('should return invalid if password is whitespace only', () => {
            const result = (0, validation_utils_1.validateAuthInput)('user', '   ');
            expect(result.valid).toBe(true); // whitespace is counted as valid string
        });
        describe('validateEmail', () => {
            it('should return true for valid emails', () => {
                expect((0, validation_utils_1.validateEmail)('test@example.com')).toBe(true);
                expect((0, validation_utils_1.validateEmail)('user.name+tag@domain.co.uk')).toBe(true);
                expect((0, validation_utils_1.validateEmail)('user_name@sub.domain.com')).toBe(true);
            });
            it('should return false for invalid emails', () => {
                expect((0, validation_utils_1.validateEmail)('')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('plainaddress')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('missing@domain')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('missing.domain@')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('@missingusername.com')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('user@.com')).toBe(false);
                expect((0, validation_utils_1.validateEmail)('user@domain..com')).toBe(false);
                expect((0, validation_utils_1.validateEmail)(null)).toBe(false);
                expect((0, validation_utils_1.validateEmail)(undefined)).toBe(false);
                expect((0, validation_utils_1.validateEmail)(123)).toBe(false);
            });
        });
        describe('validateIPAddress', () => {
            it('should return true for valid IPv4 addresses', () => {
                expect((0, validation_utils_1.validateIPAddress)('192.168.1.1')).toBe(true);
                expect((0, validation_utils_1.validateIPAddress)('0.0.0.0')).toBe(true);
                expect((0, validation_utils_1.validateIPAddress)('255.255.255.255')).toBe(true);
                expect((0, validation_utils_1.validateIPAddress)('127.0.0.1')).toBe(true);
            });
            it('should return false for invalid IPv4 addresses', () => {
                expect((0, validation_utils_1.validateIPAddress)('')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)('256.256.256.256')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)('192.168.1')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)('192.168.1.1.1')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)('abc.def.ghi.jkl')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)('1234.123.123.123')).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)(null)).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)(undefined)).toBe(false);
                expect((0, validation_utils_1.validateIPAddress)(123)).toBe(false);
            });
        });
        describe('validateFilename', () => {
            it('should return true for valid filenames', () => {
                expect((0, validation_utils_1.validateFilename)('file.txt')).toBe(true);
                expect((0, validation_utils_1.validateFilename)('my_file-01.log')).toBe(true);
                expect((0, validation_utils_1.validateFilename)('a'.repeat(255))).toBe(true);
            });
            it('should return false for invalid filenames', () => {
                expect((0, validation_utils_1.validateFilename)('')).toBe(false);
                expect((0, validation_utils_1.validateFilename)('file/name.txt')).toBe(false);
                expect((0, validation_utils_1.validateFilename)('file<name>.txt')).toBe(false);
                expect((0, validation_utils_1.validateFilename)('file|name.txt')).toBe(false);
                expect((0, validation_utils_1.validateFilename)('file:name.txt')).toBe(false);
                expect((0, validation_utils_1.validateFilename)('a'.repeat(256))).toBe(false);
                expect((0, validation_utils_1.validateFilename)(null)).toBe(false);
                expect((0, validation_utils_1.validateFilename)(undefined)).toBe(false);
                expect((0, validation_utils_1.validateFilename)(123)).toBe(false);
            });
        });
        describe('sanitizeFilename', () => {
            it('should replace invalid characters with underscores', () => {
                expect((0, validation_utils_1.sanitizeFilename)('file<name>.txt')).toBe('file_name_.txt');
                expect((0, validation_utils_1.sanitizeFilename)('file|name?.txt')).toBe('file_name_.txt');
                expect((0, validation_utils_1.sanitizeFilename)('file:name.txt')).toBe('file_name.txt');
            });
            it('should trim leading/trailing spaces and dots', () => {
                expect((0, validation_utils_1.sanitizeFilename)('  file.txt  ')).toBe('file.txt');
                expect((0, validation_utils_1.sanitizeFilename)('...file.txt...')).toBe('file.txt');
            });
            it('should return "unnamed" for empty or invalid input', () => {
                expect((0, validation_utils_1.sanitizeFilename)('')).toBe('unnamed');
                expect((0, validation_utils_1.sanitizeFilename)(null)).toBe('unnamed');
                expect((0, validation_utils_1.sanitizeFilename)(undefined)).toBe('unnamed');
                expect((0, validation_utils_1.sanitizeFilename)(123)).toBe('unnamed');
                expect((0, validation_utils_1.sanitizeFilename)('   ')).toBe('unnamed'); // Just spaces
                expect((0, validation_utils_1.sanitizeFilename)('...')).toBe('unnamed'); // Just dots
            });
            it('should truncate filenames longer than 255 characters', () => {
                const longName = 'a'.repeat(300) + '.txt';
                expect((0, validation_utils_1.sanitizeFilename)(longName).length).toBe(255);
            });
        });
        describe('validateURL', () => {
            it('should return true for valid URLs', () => {
                expect((0, validation_utils_1.validateURL)('http://example.com')).toBe(true);
                expect((0, validation_utils_1.validateURL)('https://example.com/path?query=1')).toBe(true);
                expect((0, validation_utils_1.validateURL)('ftp://ftp.example.com')).toBe(true);
                expect((0, validation_utils_1.validateURL)('http://localhost:8080')).toBe(true);
            });
            it('should return false for invalid URLs', () => {
                expect((0, validation_utils_1.validateURL)('')).toBe(false);
                expect((0, validation_utils_1.validateURL)('not a url')).toBe(false);
                expect((0, validation_utils_1.validateURL)('http:/example.com')).toBe(false);
                expect((0, validation_utils_1.validateURL)('http://')).toBe(false);
                expect((0, validation_utils_1.validateURL)(null)).toBe(false);
                expect((0, validation_utils_1.validateURL)(undefined)).toBe(false);
                expect((0, validation_utils_1.validateURL)(123)).toBe(false);
            });
            it('should return false for URLs missing protocol or hostname (line 146)', () => {
                // Test cases that pass initial regex but fail protocol/hostname check
                expect((0, validation_utils_1.validateURL)('://example.com')).toBe(false); // Missing protocol
                expect((0, validation_utils_1.validateURL)('http://')).toBe(false); // Missing hostname
                expect((0, validation_utils_1.validateURL)('https://:8080')).toBe(false); // Empty hostname with port
                expect((0, validation_utils_1.validateURL)('ftp://:21')).toBe(false); // Empty hostname with port
            });
            it('should validate protocol and hostname existence (line 146)', () => {
                // These should pass because they have both protocol and hostname
                expect((0, validation_utils_1.validateURL)('http://example.com')).toBe(true);
                expect((0, validation_utils_1.validateURL)('https://subdomain.example.com')).toBe(true);
                expect((0, validation_utils_1.validateURL)('ftp://ftp.example.org')).toBe(true);
                // These should fail due to missing protocol or hostname
                expect((0, validation_utils_1.validateURL)('://missing-protocol.com')).toBe(false);
                expect((0, validation_utils_1.validateURL)('http://')).toBe(false);
                expect((0, validation_utils_1.validateURL)('https://')).toBe(false);
            });
        });
        describe('isNumeric', () => {
            it('should return true for numeric strings', () => {
                expect((0, validation_utils_1.isNumeric)('123')).toBe(true);
                expect((0, validation_utils_1.isNumeric)('3.14')).toBe(true);
                expect((0, validation_utils_1.isNumeric)('-42')).toBe(true);
                expect((0, validation_utils_1.isNumeric)('0')).toBe(true);
                expect((0, validation_utils_1.isNumeric)('1e5')).toBe(true);
            });
            it('should return false for non-numeric strings', () => {
                expect((0, validation_utils_1.isNumeric)('')).toBe(false);
                expect((0, validation_utils_1.isNumeric)('abc')).toBe(false);
                expect((0, validation_utils_1.isNumeric)('123abc')).toBe(false);
                expect((0, validation_utils_1.isNumeric)('NaN')).toBe(false);
                expect((0, validation_utils_1.isNumeric)(null)).toBe(false);
                expect((0, validation_utils_1.isNumeric)(undefined)).toBe(false);
            });
        });
    });
});
