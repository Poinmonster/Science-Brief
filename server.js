const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ScienceBrief/1.0; +https://sciencebrief.app)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['dc:date', 'dcDate'],
      ['prism:doi', 'doi'],
      ['prism:publicationName', 'publicationName'],
      ['content:encoded', 'contentEncoded'],
      ['description', 'description'],
      ['author', 'author'],
    ],
  },
});

// Enable CORS for all origins (configure appropriately for production)
app.use(cors());
app.use(express.json());

// Default feed configurations
const DEFAULT_FEEDS = {
  psychology: [
    { id: 'psych-sci', name: 'Psychological Science', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pss&type=etoc&feed=rss' },
    { id: 'nat-hum-beh', name: 'Nature Human Behaviour', url: 'https://www.nature.com/nathumbehav.rss' },
    { id: 'curr-dir', name: 'Current Directions in Psych Science', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=cdp&type=etoc&feed=rss' },
  ],
  neuroscience: [
    { id: 'nat-neuro', name: 'Nature Neuroscience', url: 'https://www.nature.com/neuro.rss' },
    { id: 'nat-rev-neuro', name: 'Nature Reviews Neuroscience', url: 'https://www.nature.com/nrn.rss' },
    { id: 'neuron', name: 'Neuron', url: 'https://www.cell.com/neuron/current.rss' },
    { id: 'j-neuro', name: 'Journal of Neuroscience', url: 'https://www.jneurosci.org/rss/current.xml' },
    { id: 'trends-cog', name: 'Trends in Cognitive Sciences', url: 'https://www.cell.com/trends/cognitive-sciences/current.rss' },
  ],
  perception: [
    { id: 'perception', name: 'Perception', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pec&type=etoc&feed=rss' },
    { id: 'aud-perc-cog', name: 'Auditory Perception & Cognition', url: 'https://www.tandfonline.com/feed/rss/rpac20' },
  ],
  music: [
    { id: 'music-perc', name: 'Music Perception', url: 'https://online.ucpress.edu/mp/rss/current.xml' },
    { id: 'psych-music', name: 'Psychology of Music', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pom&type=etoc&feed=rss' },
    { id: 'musicae-sci', name: 'Musicae Scientiae', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=msx&type=etoc&feed=rss' },
  ],
};

/**
 * Extract keywords from title and description
 */
function extractKeywords(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Common scientific keywords to look for
  const keywordPatterns = [
    'neural', 'brain', 'cognition', 'cognitive', 'memory', 'perception',
    'attention', 'learning', 'behavior', 'behaviour', 'emotion', 'social',
    'music', 'auditory', 'visual', 'motor', 'language', 'speech',
    'development', 'aging', 'plasticity', 'therapy', 'treatment',
    'depression', 'anxiety', 'disorder', 'clinical', 'fmri', 'eeg',
    'rhythm', 'pitch', 'temporal', 'spatial', 'sensory', 'cortex',
    'hippocampus', 'prefrontal', 'consciousness', 'decision', 'reward',
    'infant', 'child', 'adult', 'culture', 'cross-cultural',
  ];
  
  const found = keywordPatterns.filter(kw => text.includes(kw));
  return [...new Set(found)].slice(0, 6);
}

/**
 * Extract authors from various RSS field formats
 */
function extractAuthors(item) {
  if (item.creator) return item.creator;
  if (item.author) return item.author;
  if (item['dc:creator']) return item['dc:creator'];
  
  // Try to extract from description if it contains author info
  const desc = item.description || item.contentEncoded || '';
  const authorMatch = desc.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:and|&)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)/i);
  if (authorMatch) return authorMatch[1];
  
  return 'Unknown authors';
}

/**
 * Extract DOI from various sources
 */
function extractDOI(item) {
  if (item.doi) return item.doi;
  
  // Try to find DOI in link
  const linkMatch = (item.link || '').match(/10\.\d{4,}\/[^\s]+/);
  if (linkMatch) return linkMatch[0];
  
  // Try to find in description
  const descMatch = (item.description || '').match(/doi[:\s]+([10\.\d{4,}\/[^\s<]+)/i);
  if (descMatch) return descMatch[1];
  
  return null;
}

/**
 * Clean HTML from description text
 */
function cleanHTML(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a single RSS feed
 */
async function parseFeed(feedConfig) {
  try {
    console.log(`Fetching feed: ${feedConfig.name} (${feedConfig.url})`);
    const feed = await parser.parseURL(feedConfig.url);
    
    const articles = feed.items.map((item, index) => {
      const description = cleanHTML(item.description || item.contentEncoded || item.summary || '');
      const title = cleanHTML(item.title || 'Untitled');
      
      return {
        id: `${feedConfig.id}-${index}-${Date.now()}`,
        feedId: feedConfig.id,
        title,
        journal: feedConfig.name,
        authors: extractAuthors(item),
        date: item.pubDate || item.isoDate || item.dcDate || new Date().toISOString(),
        description,
        link: item.link || '',
        doi: extractDOI(item),
        keywords: extractKeywords(title, description),
        // These will be populated by AI later
        summary: null,
        context: null,
        pitchScore: null,
        suggestedPublications: null,
      };
    });
    
    console.log(`  Found ${articles.length} articles`);
    return {
      success: true,
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      articles,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${feedConfig.name}:`, error.message);
    return {
      success: false,
      feedId: feedConfig.id,
      feedName: feedConfig.name,
      error: error.message,
      articles: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Get list of available default feeds
 */
app.get('/api/feeds', (req, res) => {
  res.json({
    success: true,
    feeds: DEFAULT_FEEDS,
  });
});

/**
 * Fetch a single feed by URL
 */
app.post('/api/fetch-feed', async (req, res) => {
  const { url, name, id } = req.body;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'Feed URL is required' 
    });
  }
  
  const feedConfig = {
    id: id || `custom-${Date.now()}`,
    name: name || 'Custom Feed',
    url,
  };
  
  const result = await parseFeed(feedConfig);
  res.json(result);
});

/**
 * Fetch multiple feeds at once
 */
app.post('/api/fetch-feeds', async (req, res) => {
  const { feeds } = req.body;
  
  if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Array of feed configurations is required' 
    });
  }
  
  console.log(`Fetching ${feeds.length} feeds...`);
  
  // Fetch all feeds in parallel with a concurrency limit
  const results = await Promise.all(
    feeds.map(feedConfig => parseFeed(feedConfig))
  );
  
  // Combine all articles and sort by date
  const allArticles = results
    .flatMap(r => r.articles)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const successCount = results.filter(r => r.success).length;
  const failedFeeds = results.filter(r => !r.success).map(r => ({
    feedId: r.feedId,
    feedName: r.feedName,
    error: r.error,
  }));
  
  res.json({
    success: true,
    totalFeeds: feeds.length,
    successfulFeeds: successCount,
    failedFeeds,
    totalArticles: allArticles.length,
    articles: allArticles,
    fetchedAt: new Date().toISOString(),
  });
});

/**
 * Fetch all default feeds by category
 */
app.get('/api/fetch-all', async (req, res) => {
  const { categories } = req.query;
  
  let feedsToFetch = [];
  
  if (categories) {
    // Fetch only specified categories
    const categoryList = categories.split(',');
    categoryList.forEach(cat => {
      if (DEFAULT_FEEDS[cat]) {
        feedsToFetch = feedsToFetch.concat(DEFAULT_FEEDS[cat]);
      }
    });
  } else {
    // Fetch all categories
    Object.values(DEFAULT_FEEDS).forEach(categoryFeeds => {
      feedsToFetch = feedsToFetch.concat(categoryFeeds);
    });
  }
  
  console.log(`Fetching ${feedsToFetch.length} feeds from ${categories || 'all'} categories...`);
  
  const results = await Promise.all(
    feedsToFetch.map(feedConfig => parseFeed(feedConfig))
  );
  
  const allArticles = results
    .flatMap(r => r.articles)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const successCount = results.filter(r => r.success).length;
  const failedFeeds = results.filter(r => !r.success).map(r => ({
    feedId: r.feedId,
    feedName: r.feedName,
    error: r.error,
  }));
  
  res.json({
    success: true,
    totalFeeds: feedsToFetch.length,
    successfulFeeds: successCount,
    failedFeeds,
    totalArticles: allArticles.length,
    articles: allArticles,
    fetchedAt: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         The Science Brief - Backend Service           ║
╠═══════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}              ║
║                                                       ║
║  Endpoints:                                           ║
║    GET  /api/health       - Health check              ║
║    GET  /api/feeds        - List available feeds      ║
║    GET  /api/fetch-all    - Fetch all default feeds   ║
║    POST /api/fetch-feed   - Fetch single feed         ║
║    POST /api/fetch-feeds  - Fetch multiple feeds      ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
