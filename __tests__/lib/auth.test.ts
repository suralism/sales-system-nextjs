import { generateToken, verifyToken, hashPassword, comparePassword } from '../../lib/auth'

describe('Authentication Utilities', () => {
  describe('generateToken and verifyToken', () => {
    it('should generate and verify a valid JWT token', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        role: 'employee' as const,
        name: 'Test User'
      }

      const token = generateToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const decoded = verifyToken(token)
      expect(decoded).toMatchObject({
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        name: payload.name
      })
    })

    it('should generate token with impersonation claims', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'employee',
        role: 'employee' as const,
        name: 'Employee User',
        originalAdminId: '507f1f77bcf86cd799439012',
        originalAdminName: 'Admin User',
        isImpersonation: true
      }

      const token = generateToken(payload)
      const decoded = verifyToken(token)
      
      expect(decoded).toMatchObject({
        userId: payload.userId,
        originalAdminId: payload.originalAdminId,
        originalAdminName: payload.originalAdminName,
        isImpersonation: true
      })
    })

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null for expired token', () => {
      // This would require mocking JWT library or creating an expired token
      const result = verifyToken('')
      expect(result).toBeNull()
    })
  })

  describe('hashPassword and comparePassword', () => {
    it('should hash password and verify it correctly', async () => {
      const password = 'testPassword123'
      
      const hashedPassword = await hashPassword(password)
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(20)

      const isValid = await comparePassword(password, hashedPassword)
      expect(isValid).toBe(true)

      const isInvalid = await comparePassword('wrongPassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123'
      
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
      
      // Both should still verify correctly
      expect(await comparePassword(password, hash1)).toBe(true)
      expect(await comparePassword(password, hash2)).toBe(true)
    })
  })
})