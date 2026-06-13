/**
 * Product ranking & scoring algorithm for the DEHOT feed.
 *
 * score = views*1 + clicks*3 + favorites*4 + chats*10
 *       + freshness_boost + location_boost + quality_score + vip_boost + ctr_bonus
 */

// Freshness boost table: hours since creation → bonus points
const FRESHNESS_TABLE = [
  { hours: 1,   boost: 100 },
  { hours: 24,  boost: 70  },
  { hours: 72,  boost: 30  },
  { hours: 168, boost: 10  },
];

function freshnessBoost(createdAt) {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  for (const { hours, boost } of FRESHNESS_TABLE) {
    if (hoursOld <= hours) return boost;
  }
  return 0;
}

// Quality score: rewards complete listings
function qualityScore(product) {
  let score = 0;
  if (product.images && product.images.length > 0)      score += 20;
  if (product.description && product.description.length > 50) score += 15;
  if (product.categoryId)                               score += 10;
  if (product.basePrice > 0)                            score += 5;
  return score; // max 50
}

// VIP: active when isVip=true and vipUntil is null or in the future
function isVipActive(product) {
  if (!product.isVip) return false;
  if (!product.vipUntil) return true;
  return new Date(product.vipUntil) > new Date();
}

/**
 * Compute the full ranking score for a product.
 * @param {object} product  - Prisma product record (with _count.favorites, _count.chats)
 * @param {string} [userRegion] - The user's current region for location boost
 */
function computeScore(product, userRegion = null) {
  const views     = product.viewCount  || 0;
  const clicks    = product.clickCount || 0;
  const favorites = product._count?.favorites || 0;
  const chats     = product._count?.chats     || 0;

  // CTR bonus: rewards products with high click-through rate
  const ctr = views > 10 ? Math.min((clicks / views) * 50, 50) : 0;

  const freshness = freshnessBoost(product.createdAt);
  const quality   = qualityScore(product);
  const vip       = isVipActive(product) ? 200 : 0;

  // Location boost: same region gets +30
  const location =
    userRegion && product.region &&
    product.region.toLowerCase().includes(userRegion.toLowerCase())
      ? 30 : 0;

  return (
    views     * 1  +
    clicks    * 3  +
    favorites * 4  +
    chats     * 10 +
    ctr            +
    freshness      +
    location       +
    quality        +
    vip
  );
}

/**
 * Build the mixed feed from a scored pool.
 * Distribution: 40% popular, 30% new, 20% nearby, 10% random.
 *
 * @param {object[]} pool       - Products already scored (each has ._score)
 * @param {number}   limit      - Items to return
 * @param {string}   [region]   - User region for nearby bucket
 * @returns {object[]}
 */
function buildFeed(pool, limit, region) {
  const popular = [...pool].sort((a, b) => b._score - a._score);
  const fresh   = [...pool].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const nearby  = region
    ? [...pool]
        .filter(p => p.region && p.region.toLowerCase().includes(region.toLowerCase()))
        .sort((a, b) => b._score - a._score)
    : [];
  const random  = [...pool].sort(() => Math.random() - 0.5);

  const popularCount = Math.round(limit * 0.4);
  const freshCount   = Math.round(limit * 0.3);
  const nearbyCount  = region ? Math.round(limit * 0.2) : 0;
  const randomCount  = limit - popularCount - freshCount - nearbyCount;

  const seen = new Set();
  const pick = (bucket, n) => {
    const out = [];
    for (const p of bucket) {
      if (out.length >= n) break;
      if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    }
    return out;
  };

  return [
    ...pick(popular, popularCount),
    ...pick(fresh,   freshCount),
    ...pick(nearby,  nearbyCount),
    ...pick(random,  randomCount),
  ].slice(0, limit);
}

module.exports = { computeScore, buildFeed, freshnessBoost, qualityScore, isVipActive };
