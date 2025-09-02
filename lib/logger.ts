interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT'
  message: string
  context?: Record<string, unknown>
  userId?: string
  sessionId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private static instance: Logger
  private isDevelopment: boolean
  private logLevel: number

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    // Log levels: DEBUG=0, INFO=1, WARN=2, ERROR=3, AUDIT=4
    this.logLevel = this.isDevelopment ? 0 : 1
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      let output = `[${entry.timestamp}] ${entry.level}: ${entry.message}`
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
      }
      if (entry.error) {
        output += `\n  Error: ${entry.error.name} - ${entry.error.message}`
        if (entry.error.stack) {
          output += `\n  Stack: ${entry.error.stack}`
        }
      }
      return output
    } else {
      // JSON format for production (easier for log aggregation)
      return JSON.stringify(entry)
    }
  }

  private shouldLog(level: string): boolean {
    const levelMap = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, AUDIT: 4 }
    return levelMap[level as keyof typeof levelMap] >= this.logLevel
  }

  private log(level: LogEntry['level'], message: string, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    }

    const formattedMessage = this.formatLogEntry(entry)
    
    // Output to appropriate console method
    switch (level) {
      case 'DEBUG':
        console.debug(formattedMessage)
        break
      case 'INFO':
      case 'AUDIT':
        console.info(formattedMessage)
        break
      case 'WARN':
        console.warn(formattedMessage)
        break
      case 'ERROR':
        console.error(formattedMessage)
        break
    }

    // In production, you might want to send to external logging service
    if (!this.isDevelopment && (level === 'ERROR' || level === 'AUDIT')) {
      this.sendToExternalService(entry)
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // Placeholder for external logging service integration
    // Examples: Datadog, New Relic, CloudWatch, etc.
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) })
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, { context })
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, { context })
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, { context })
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined

    this.log('ERROR', message, { context, error: errorInfo })
  }

  // Special method for security and audit events
  audit(message: string, context?: Record<string, unknown>): void {
    this.log('AUDIT', message, { context })
  }

  // Request logging helper
  logRequest(method: string, url: string, statusCode: number, duration: number, context?: Partial<LogEntry>): void {
    const message = `${method} ${url} ${statusCode} - ${duration}ms`
    const requestContext = {
      method,
      url,
      statusCode,
      duration,
      ...context?.context
    }

    if (statusCode >= 500) {
      this.error(message, undefined, requestContext)
    } else if (statusCode >= 400) {
      this.warn(message, requestContext)
    } else {
      this.info(message, requestContext)
    }
  }

  // Authentication event logging
  logAuthEvent(event: string, userId?: string, success: boolean = true, context?: Record<string, unknown>): void {
    const message = `Auth event: ${event} - ${success ? 'SUCCESS' : 'FAILURE'}`
    const authContext = {
      event,
      success,
      userId,
      ...context
    }

    if (success) {
      this.audit(message, authContext)
    } else {
      this.warn(message, authContext)
    }
  }

  // Database operation logging
  logDatabaseOperation(operation: string, collection: string, duration: number, error?: Error): void {
    const message = `Database ${operation} on ${collection} - ${duration}ms`
    const dbContext = {
      operation,
      collection,
      duration
    }

    if (error) {
      this.error(message, error, dbContext)
    } else {
      this.debug(message, dbContext)
    }
  }
}

// Singleton logger instance
export const logger = Logger.getInstance()

// Convenience functions for common logging patterns
export const logAuthSuccess = (userId: string, action: string, context?: Record<string, unknown>) => {
  logger.logAuthEvent(action, userId, true, context)
}

export const logAuthFailure = (action: string, context?: Record<string, unknown>) => {
  logger.logAuthEvent(action, undefined, false, context)
}

export const logSecurityEvent = (message: string, context?: Record<string, unknown>) => {
  logger.audit(`Security: ${message}`, context)
}

export const logPerformanceWarning = (operation: string, duration: number, threshold: number) => {
  if (duration > threshold) {
    logger.warn(`Performance warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
      operation,
      duration,
      threshold
    })
  }
}

// Request context helper
export interface RequestContext {
  requestId: string
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
}

let requestContext: RequestContext | null = null

export const setRequestContext = (context: RequestContext) => {
  requestContext = context
}

export const getRequestContext = (): RequestContext | null => requestContext

export const clearRequestContext = () => {
  requestContext = null
}