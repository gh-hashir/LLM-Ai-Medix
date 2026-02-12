/**
 * Structured logger using pino
 * Adds request ID, provider, latency tracking
 */
import pino from 'pino'

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino/file',
        options: { destination: 1 } // stdout
    } : undefined,
    formatters: {
        level: (label) => ({ level: label })
    },
    base: {
        service: 'ai-medix',
        version: '2.0.0'
    }
})

let requestCounter = 0

/**
 * Create a child logger with request context
 */
export function createRequestLogger(route) {
    requestCounter++
    return logger.child({
        requestId: `req_${Date.now()}_${requestCounter}`,
        route
    })
}

/**
 * Log an AI provider call result
 */
export function logProviderCall(reqLogger, { provider, latencyMs, success, fallback, error }) {
    const logData = { provider, latencyMs, success, fallback }
    if (error) logData.error = error

    if (success) {
        reqLogger.info(logData, `AI call succeeded via ${provider}`)
    } else {
        reqLogger.warn(logData, `AI call failed for ${provider}`)
    }
}

export default logger
