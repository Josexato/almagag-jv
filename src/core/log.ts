/**
 * Bitácora del motor. La doctrina del audit: toda violación se NOMBRA
 * (quién, cuánto, dónde). El log es parte del contrato de usuario y sus
 * mensajes van en español neutro, con números.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogEntry {
  readonly level: LogLevel;
  readonly msg: string;
}

export class Log {
  readonly #entries: LogEntry[] = [];

  debug(msg: string): void {
    this.#entries.push({ level: 'DEBUG', msg });
  }
  info(msg: string): void {
    this.#entries.push({ level: 'INFO', msg });
  }
  warning(msg: string): void {
    this.#entries.push({ level: 'WARNING', msg });
  }
  error(msg: string): void {
    this.#entries.push({ level: 'ERROR', msg });
  }

  get entries(): readonly LogEntry[] {
    return this.#entries.slice();
  }
}

/** Error de formato con nombre: el archivo declaró algo que el motor no puede honrar. */
export class FormatError extends Error {
  override readonly name = 'FormatError';
}
