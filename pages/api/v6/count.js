import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CACHE_KEY = 'url_count_cache';
const CACHE_EXPIRY = 60 * 5; // 5 minutes in seconds

export default async function handler(req, res) {
  try {
    // Set Cache-Control header for HTTP caching (CDN and browsers)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=59');
    
    // Try to get the count from cache first
    const cachedCount = await redis.get(CACHE_KEY);
    
    if (cachedCount !== null) {
      // Return cached count if available
      return res.status(200).json(parseInt(cachedCount));
    }
    
    // If no cached value, calculate the count
    let count = 0;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { count: 100 });
      count += keys.length;
      cursor = nextCursor;
    } while (cursor !== "0");
    
    // Cache the new count
    await redis.set(CACHE_KEY, count.toString(), { ex: CACHE_EXPIRY });
    
    res.status(200).json(count);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
