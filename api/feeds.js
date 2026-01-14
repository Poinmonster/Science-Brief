const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ScienceBrief/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['dc:date', 'dcDate'],
      ['prism:doi', 'doi'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const DEFAULT_FEEDS = {
  psychology: [
    { id: 'psych-sci', name: 'Psychological Science', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pss&type=etoc&feed=rss' },
    { id: 'nat-hum-beh', name: 'Nature Human Behaviour', url: 'https://www.nature.com/nathumbehav.rss' },
  ],
  neuroscience: [
    { id: 'nat-neuro', name: 'Nature Neuroscience', url: 'https://www.nature.com/neuro.rss' },
    { id: 'nat-rev-neuro', name: 'Nature Reviews Neuroscience', url: 'https://www.nature.com/nrn.rss' },
    { id: 'neuron', name: 'Neuron', url: 'https://www.cell.com/neuron/current.rss' },
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

function extractKeywords(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  const keywordPatterns = [
    'neural', 'brain', 'cognition', 'cognitive', 'memory', 'perception',
    'attention', 'learning', 'behavior', 'emotion', 'social', 'music',
    'auditory', 'visual', 'motor', 'language', 'speech', 'development',
    'plasticity', 'therapy', 'treatment', 'depression', 'anxiety',
    'rhythm', 'pitch', 'temporal', 'spatial', 'sensory', 'cortex',
    'consciousness', 'decision', 'reward', 'infant', 'culture',
  ];
  return [...new Set(keywordPatterns.filter(kw => text.includes(kw)))].slice(0, 6);
}

function extractAuthors(item) {
  if (item.creator) return item.creator;
  if (item.author) return item.author;
  return 'Unknown authors';
}

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

async function parseFeed(feedConfig) {
  try {
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
        keywords: extractKeywords(title, description),
        summary: null,
        context: null,
        pitchScore: null,
        suggestedPublications: null,
      };
    });
    return { success: true, feedId: feedConfig.id, feedName: feedConfig.name, articles, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { success: false, feedId: feedConfig.id, feedName: feedConfig.name, error: error.message, articles: [], fetchedAt: new Date().toISOString() };
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { categories, feedUrls } = req.method === 'POST' ? req.body : req.query;
  
  let feedsToFetch = [];
  
  // If custom feed URLs provided
  if (feedUrls && Array.isArray(feedUrls)) {
    feedsToFetch = feedUrls;
  } else if (categories) {
    // Fetch specific categories
    const categoryList = categories.split(',');
    categoryList.forEach(cat => {
      if (DEFAULT_FEEDS[cat]) {
        feedsToFetch = feedsToFetch.concat(DEFAULT_FEEDS[cat]);
      }
    });
  } else {
    // Fetch all default feeds
    Object.values(DEFAULT_FEEDS).forEach(categoryFeeds => {
      feedsToFetch = feedsToFetch.concat(categoryFeeds);
    });
  }
  
  if (feedsToFetch.length === 0) {
    return res.status(400).json({ success: false, error: 'No feeds to fetch' });
  }
  
  const results = await Promise.all(feedsToFetch.map(parseFeed));
  
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
};
