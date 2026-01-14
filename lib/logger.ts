// Simple tagged logger utility
// Usage: logger.info('TAG', 'message', { meta })
//        logger.error('TAG', 'message', { meta })

type LogMeta = Record<string, unknown> | undefined

interface Logger {
    info: (tag: string, message: string, meta?: LogMeta) => void
    error: (tag: string, message: string, meta?: LogMeta) => void
}

function formatMessage(tag: string, message: string, meta?: LogMeta): string {
    const prefix = `[${tag}]`
    if (meta) {
        const metaStr =
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
        return `${prefix} ${message}${metaStr}`
    }
    return `${prefix} ${message}`
}

export const logger: Logger = {
    info: (tag: string, message: string, meta?: LogMeta) => {
        console.log(formatMessage(tag, message, meta))
    },
    error: (tag: string, message: string, meta?: LogMeta) => {
        console.error(formatMessage(tag, message, meta))
    },
}
