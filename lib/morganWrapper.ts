import morgan from 'morgan'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

// create a tiny writable stream that logs to console
const stream = {
  write: (message: string) => console.log(message.trim()),
}

const logger = morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms', { stream })

export function withMorgan(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // run morgan on this request
    await new Promise<void>((resolve) => {
      // morgan expects (req, res, next)
      // @ts-ignore
      logger(req, res, () => resolve())
    })
    return handler(req, res)
  }
}
