export const colors = {
  "RESET": "\x1b[0m",
  "BLACK": "\x1b[30m",
  "RED": "\x1b[31m",
  "GREEN": "\x1b[32m",
  "YELLOW": "\x1b[33m",
  "BLUE": "\x1b[34m",
  "GRAY": "\x1b[90m",
  "BG_YELLOW": "\x1b[43m",
  "BG_GREEN": "\x1b[42m",
  "BG_BLUE": "\x1b[44m",
  "BG_RED": "\x1b[41m",
  "BG_GRAY": "\x1b[100m"
}

type ColorKey = keyof typeof colors

export type Text = {
  color: ColorKey
  message: string
}

export function Text(color: ColorKey, message: string): string {
  return `${colors[color]}${message}${colors.RESET}`
}

type Options = {
  timestamp?: boolean
}

export default function logger(
  messages: string[] | string,
  options?: Options
): string {
  let logString = ""

  try {
    if (!Array.isArray(messages)) {
      messages = [messages]
    }
    
    logString = messages.join(" ")

    if (options?.timestamp) {
      const date = new Date()
      const time = date.toLocaleTimeString()
      logString = `[${time}] ${logString}`
    }

    console.info(logString)
  } catch (err) {
    console.error(`${colors.RED}Error in logger:`, err, colors.RESET)
  }

  return logString
}