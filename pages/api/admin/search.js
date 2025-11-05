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
    const { q } = req.query

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const query = q.toLowerCase().trim()
    const results = []
    let cursor = 0
    let scanCount = 0
    const maxScans = 100 // Limit scans to prevent timeout
    const maxResults = 100 // Limit results

    // Scan keys and check matches on the fly
    do {
      const result = await redis.scan(cursor, { count: 100 })
      cursor = result[0]
      const keys = result[1]

      // Filter matching keys first
      const matchingKeys = []
      for (const key of keys) {
        const keyStr = typeof key === 'string' ? key : String(key)
        if (keyStr.startsWith('_')) continue

        const shortKey = keyStr.includes('$') ? keyStr.split('$')[0] : keyStr
        if (shortKey.toLowerCase().includes(query) || keyStr.toLowerCase().includes(query)) {
          matchingKeys.push(keyStr)
        }
      }

      // Fetch values for matching keys in this batch
      if (matchingKeys.length > 0) {
        const urlPromises = matchingKeys.map(async (keyStr) => {
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

        const batchResults = await Promise.all(urlPromises)
        results.push(...batchResults)

        // Early exit if we have enough results
        if (results.length >= maxResults) {
          break
        }
      }

      scanCount++
      if (scanCount >= maxScans) break

    } while (cursor !== 0)

    // Sort by key (most recent first)
    results.sort((a, b) => b.key.localeCompare(a.key))

    // Limit to maxResults
    const limitedResults = results.slice(0, maxResults)

    res.status(200).json({
      results: limitedResults,
      total: limitedResults.length,
      hasMore: results.length > maxResults
    })
  } catch (error) {
    console.error('Error searching URLs:', error)
    res.status(500).json({ error: 'Failed to search URLs', message: error.message })
  }
}
