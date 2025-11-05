import crypto from 'crypto'
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const secret = process.env.ADMIN_PASSWORD || '0000'
  const expected = crypto.createHmac('sha256', secret).update('admin').digest('hex')
  if (req.cookies?.admin_auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { keys } = body

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' })
    }

    // Delete all specified keys
    const deletePromises = keys.map(key => redis.del(key))
    await Promise.all(deletePromises)

    res.status(200).json({
      success: true,
      deleted: keys.length,
      message: `Successfully deleted ${keys.length} URL(s)`
    })
  } catch (error) {
    console.error('Error deleting URLs:', error)
    res.status(500).json({ error: 'Failed to delete URLs' })
  }
}
