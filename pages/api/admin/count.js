import crypto from 'crypto'
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const secret = process.env.ADMIN_PASSWORD || '0000'
  const expected = crypto.createHmac('sha256', secret).update('admin').digest('hex')
  if (req.cookies?.admin_auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use DBSIZE to get total number of keys (very fast)
    const totalKeys = await redis.dbsize()

    // Calculate approximate pages (assuming 10 per page)
    const perPage = 10
    const totalPages = Math.ceil(totalKeys / perPage)

    res.status(200).json({
      total: totalKeys,
      totalPages: totalPages,
      perPage: perPage
    })
  } catch (error) {
    console.error('Error getting count:', error)
    res.status(500).json({ error: 'Failed to get count', message: error.message })
  }
}
