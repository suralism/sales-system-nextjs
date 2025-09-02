# Sales System API Documentation

## Overview

This document provides comprehensive documentation for the Sales System Next.js API, focusing on the enhanced authentication system and security features implemented in Phase 1.

## Table of Contents

1. [Authentication System](#authentication-system)
2. [Security Features](#security-features)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Validation System](#validation-system)
6. [Rate Limiting](#rate-limiting)
7. [Logging & Monitoring](#logging--monitoring)

## Authentication System

### Token-Based Authentication

The system uses a dual-token approach for enhanced security:

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) for token renewal

### Token Storage

All tokens are stored as HTTP-only cookies for security:
- `accessToken`: Used for API authentication
- `refreshToken`: Used for token renewal
- `userId`: User identifier for quick lookups

### Backward Compatibility

The system maintains backward compatibility with legacy `token` cookies during the migration period.

## Security Features

### 1. Rate Limiting

Different rate limits based on endpoint sensitivity:

```typescript
// Authentication endpoints: 5 attempts per 15 minutes
authRateLimit: 5 requests / 15 minutes

// General API endpoints: 100 requests per 15 minutes  
apiRateLimit: 100 requests / 15 minutes

// Sensitive operations: 10 requests per minute
strictRateLimit: 10 requests / minute
```

### 2. Input Validation & Sanitization

- Comprehensive validation using schemas
- Automatic sanitization of user inputs
- Protection against XSS and injection attacks
- Custom validation rules for business logic

### 3. Structured Logging

- Multiple log levels: DEBUG, INFO, WARN, ERROR, AUDIT
- Request tracking and performance monitoring
- Security event auditing
- Contextual logging with request IDs

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login

Login with username and password.

**Request Body:**
```json
{
  "username": "string (required, 1-50 chars)",
  "password": "string (required, 1-128 chars)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string", 
    "name": "string",
    "position": "string",
    "phone": "string",
    "role": "admin|employee",
    "priceLevel": "number"
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes
**Sets Cookies:** `accessToken`, `refreshToken`, `userId`

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request:** No body required (uses refresh token from cookies)

**Response (Success - 200):**
```json
{
  "message": "Token refreshed successfully"
}
```

**Sets Cookies:** New `accessToken`, `refreshToken`, `userId`

#### POST /api/auth/logout

Logout and clear all authentication tokens.

**Request:** No body required

**Response (Success - 200):**
```json
{
  "message": "Logout successful"
}
```

**Clears Cookies:** All authentication cookies

#### POST /api/auth/login-as

Impersonate another user (Admin only).

**Request Body:**
```json
{
  "targetUserId": "string (required, valid ObjectId)"
}
```

**Response (Success - 200):**
```json
{
  "message": "Impersonation session started",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "role": "employee",
    "isImpersonation": true,
    "originalAdmin": {
      "id": "string",
      "name": "string"
    }
  }
}
```

**Rate Limit:** 10 requests per minute (strict)
**Authorization:** Admin role required

#### POST /api/auth/exit-impersonation

Exit impersonation session and return to admin account.

**Request:** No body required

**Response (Success - 200):**
```json
{
  "message": "Exited impersonation session",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "role": "admin"
  }
}
```

**Rate Limit:** 10 requests per minute (strict)
**Authorization:** Must be in impersonation session

### User Management Endpoints

#### GET /api/users

Get users list (Admin gets all, Employee gets own).

**Query Parameters:**
- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 10, min: 1, max: 100)

**Response (Success - 200):**
```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "name": "string",
      "position": "string", 
      "phone": "string",
      "role": "admin|employee",
      "isActive": "boolean",
      "createdAt": "string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number", 
    "total": "number",
    "pages": "number"
  }
}
```

**Rate Limit:** 100 requests per 15 minutes
**Authorization:** Any authenticated user

#### POST /api/users

Create new user (Admin only).

**Request Body:**
```json
{
  "username": "string (required, 3-50 chars, alphanumeric + underscore)",
  "email": "string (required, valid email)",
  "password": "string (required, 8-128 chars, must contain lowercase, uppercase, number)",
  "name": "string (required, 1-100 chars)",
  "position": "string (required)",
  "phone": "string (optional, valid phone format)",
  "role": "admin|employee (required)"
}
```

**Response (Success - 201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "name": "string", 
    "position": "string",
    "phone": "string",
    "role": "admin|employee",
    "isActive": true,
    "createdAt": "string"
  }
}
```

**Rate Limit:** 100 requests per 15 minutes  
**Authorization:** Admin role required

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE", 
  "errorId": "unique-error-identifier",
  "details": {} // Additional context in development/client errors
}
```

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions) 
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

### Custom Error Types

```typescript
ValidationError: 400 - Invalid input data
AuthenticationError: 401 - Authentication required/failed
AuthorizationError: 403 - Insufficient permissions  
NotFoundError: 404 - Resource not found
ConflictError: 409 - Data conflict (duplicates)
RateLimitError: 429 - Rate limit exceeded
```

## Validation System

### Validation Rules

The system supports comprehensive validation rules:

```typescript
interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'objectId'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  enum?: readonly string[]
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}
```

### Built-in Validation Schemas

#### Login Schema
```typescript
{
  username: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  password: { required: true, type: 'string', minLength: 1, maxLength: 128 }
}
```

#### User Creation Schema
```typescript
{
  username: { 
    required: true, 
    type: 'string', 
    minLength: 3, 
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_]+$/
  },
  email: { required: true, type: 'email' },
  password: { 
    required: true, 
    type: 'string', 
    minLength: 8, 
    maxLength: 128,
    custom: (value) => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)
  },
  name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
  role: { required: true, type: 'string', enum: ['admin', 'employee'] }
}
```

### Input Sanitization

Automatic sanitization includes:
- HTML/XSS character removal
- JavaScript protocol removal  
- Event handler removal
- Length limiting
- Type conversion and validation

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2023-12-01T10:15:00Z
```

### Rate Limit Exceeded Response

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

**Headers:**
```
Retry-After: 900
```

### Rate Limit Tiers

1. **Authentication** (`authRateLimit`): 5 requests / 15 minutes
2. **API Operations** (`apiRateLimit`): 100 requests / 15 minutes  
3. **Sensitive Operations** (`strictRateLimit`): 10 requests / minute

## Logging & Monitoring

### Log Levels

- **DEBUG**: Development debugging information
- **INFO**: General operational information
- **WARN**: Warning conditions (client errors 4xx)
- **ERROR**: Error conditions (server errors 5xx)
- **AUDIT**: Security and audit events

### Request Logging

All requests are automatically logged with:
- Method and URL
- Status code and response time
- User ID (when authenticated)
- IP address and User-Agent
- Request ID for tracing

### Authentication Event Logging

Special logging for security events:
- Login attempts (success/failure)
- Token refresh operations
- Impersonation start/end
- Rate limit violations
- Validation failures

### Log Context

Each log entry includes structured context:

```json
{
  "timestamp": "2023-12-01T10:15:00Z",
  "level": "INFO",
  "message": "User login successful", 
  "context": {
    "userId": "user123",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "requestId": "req-abc123"
  }
}
```

### Performance Monitoring

Request performance is tracked with:
- Response time measurement
- Database operation timing
- Slow request warnings (>threshold)
- Memory and resource usage

## Security Best Practices

### Implementation Notes

1. **Token Security**: All tokens stored as HTTP-only, Secure, SameSite cookies
2. **Password Security**: Bcrypt hashing with salt rounds = 12
3. **Input Validation**: All inputs validated and sanitized before processing
4. **SQL Injection**: MongoDB with proper parameterization prevents injection
5. **XSS Protection**: Input sanitization removes dangerous characters
6. **CSRF Protection**: SameSite cookie policy prevents CSRF attacks
7. **Rate Limiting**: Prevents brute force and DoS attacks
8. **Audit Logging**: All security events logged for monitoring
9. **Least Privilege**: Role-based access control with minimal permissions
10. **Error Handling**: Consistent error responses without information leakage

### Development vs Production

**Development:**
- Pretty-formatted logs
- Debug level logging enabled
- Detailed error messages
- Non-secure cookies (HTTP)

**Production:**
- JSON-formatted logs for aggregation
- Info level logging minimum
- Generic error messages
- Secure cookies (HTTPS)
- External logging service integration

## Migration Guide

### From Legacy Authentication

1. **Phase 1**: Dual token support (current)
   - New endpoints use enhanced tokens
   - Legacy endpoints still accept old tokens
   - Gradual migration of frontend

2. **Phase 2**: Frontend migration
   - Update frontend to use new endpoints
   - Implement token refresh logic
   - Update error handling

3. **Phase 3**: Legacy removal
   - Remove old token support
   - Clean up deprecated code
   - Update documentation

### Breaking Changes

None currently - system maintains backward compatibility.

### Recommended Updates

1. Update frontend to use refresh token flow
2. Implement automatic token refresh
3. Update error handling for new error format
4. Add rate limit handling in UI
5. Update logging to use structured format

---

*Last updated: December 2024*
*Version: 2.0*