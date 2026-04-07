import { type ILogger, LogLevel } from '@microsoft/signalr'

const NEGOTIATION_ABORT = /stopped during negotiation/i

/** Сообщение об отмене negotiate при размонтировании (React 18 Strict Mode + conn.stop()). */
export function isSignalRNegotiationAbortError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return NEGOTIATION_ABORT.test(msg)
}

/**
 * Убирает ложные Error в консоли: при двойном монтировании эффекта stop() прерывает negotiate.
 */
export function createSignalRLoggerIgnoringNegotiationAbort(): ILogger {
  return {
    log(level, message) {
      if (NEGOTIATION_ABORT.test(message)) return
      const stamp = new Date().toISOString()
      if (level >= LogLevel.Error) console.error(`[${stamp}] ${LogLevel[level]}: ${message}`)
      else if (level >= LogLevel.Warning) console.warn(`[${stamp}] ${LogLevel[level]}: ${message}`)
      else if (level >= LogLevel.Information) console.info(`[${stamp}] ${LogLevel[level]}: ${message}`)
    },
  }
}
