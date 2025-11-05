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
    const { page = 1, limit = 10 } = req.query
    const currentPage = parseInt(page)
    const perPage = parseInt(limit)

    // Limit scanning to first 1000 keys for performance
    const maxKeysToScan = 1000
    const allKeys = []
    let cursor = 0
    let scanCount = 0
    const maxScans = 50 // Limit number of scan operations

    // Scan keys with limits for performance
    do {
      const result = await redis.scan(cursor, { count: 100 })
      cursor = result[0]
      const keys = result[1]

      for (const key of keys) {
        const keyStr = typeof key === 'string' ? key : String(key)
        if (keyStr.startsWith('_')) continue
        allKeys.push(keyStr)

        // Stop if we've collected enough keys
        if (allKeys.length >= maxKeysToScan) {
          cursor = 0 // Force exit
          break
        }
      }

      scanCount++
      if (scanCount >= maxScans) break

    } while (cursor !== 0)

    // Sort keys (most recent first)
    allKeys.sort((a, b) => b.localeCompare(a))

    // Calculate pagination
    const startIndex = (currentPage - 1) * perPage
    const endIndex = startIndex + perPage
    const pageKeys = allKeys.slice(startIndex, endIndex)
    const hasMore = endIndex < allKeys.length

    // Fetch values only for the current page in parallel
    const urlPromises = pageKeys.map(async (keyStr) => {
      const url = await redis.get(keyStr)
      const isPasswordProtected = keyStr.includes('$')
      const shortKey = isPasswordProtected ? keyStr.split('$')[0] : keyStr

      return {
        key: keyStr,
        shortKey: shortKey,
        url: url,
        isPasswordProtected: isPasswordProtected,
        createdAt: null
      }
    })

    const urls = await Promise.all(urlPromises)

    res.status(200).json({
      urls: urls,
      total: null,
      page: currentPage,
      perPage: perPage,
      totalPages: null,
      hasNext: hasMore,
      hasPrev: currentPage > 1
    })
  } catch (error) {
    console.error('Error listing URLs:', error)
    res.status(500).json({ error: 'Failed to list URLs', message: error.message })
  }
}
