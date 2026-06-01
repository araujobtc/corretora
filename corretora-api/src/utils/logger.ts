const level = process.env.LOG_LEVEL || 'info';
const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[level] ?? 1;

const logger = {
  debug: (msg: string, ...args: any[]) => currentLevel <= 0 && console.debug(`[DEBUG] ${msg}`, ...args),
  info:  (msg: string, ...args: any[]) => currentLevel <= 1 && console.info(`[INFO]  ${msg}`, ...args),
  warn:  (msg: string, ...args: any[]) => currentLevel <= 2 && console.warn(`[WARN]  ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => currentLevel <= 3 && console.error(`[ERROR] ${msg}`, ...args),
};

export default logger;