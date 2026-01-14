import React, { useState, useEffect, useCallback } from 'react';

// API Configuration - change this to your deployed backend URL
const API_BASE_URL = 'http://localhost:3001/api';
// For Vercel deployment, use: const API_BASE_URL = 'https://your-app.vercel.app/api';

const DEFAULT_FEEDS = {
  psychology: [
    { id: 'psych-sci', name: 'Psychological Science', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pss&type=etoc&feed=rss', enabled: true },
    { id: 'nat-hum-beh', name: 'Nature Human Behaviour', url: 'https://www.nature.com/nathumbehav.rss', enabled: true },
    { id: 'curr-dir', name: 'Current Directions in Psych Science', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=cdp&type=etoc&feed=rss', enabled: false },
  ],
  neuroscience: [
    { id: 'nat-neuro', name: 'Nature Neuroscience', url: 'https://www.nature.com/neuro.rss', enabled: true },
    { id: 'nat-rev-neuro', name: 'Nature Reviews Neuroscience', url: 'https://www.nature.com/nrn.rss', enabled: true },
    { id: 'neuron', name: 'Neuron', url: 'https://www.cell.com/neuron/current.rss', enabled: true },
    { id: 'j-neuro', name: 'Journal of Neuroscience', url: 'https://www.jneurosci.org/rss/current.xml', enabled: false },
    { id: 'trends-cog', name: 'Trends in Cognitive Sciences', url: 'https://www.cell.com/trends/cognitive-sciences/current.rss', enabled: true },
  ],
  perception: [
    { id: 'perception', name: 'Perception', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pec&type=etoc&feed=rss', enabled: true },
    { id: 'aud-perc-cog', name: 'Auditory Perception & Cognition', url: 'https://www.tandfonline.com/feed/rss/rpac20', enabled: true },
  ],
  music: [
    { id: 'music-perc', name: 'Music Perception', url: 'https://online.ucpress.edu/mp/rss/current.xml', enabled: true },
    { id: 'psych-music', name: 'Psychology of Music', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=pom&type=etoc&feed=rss', enabled: true },
    { id: 'musicae-sci', name: 'Musicae Scientiae', url: 'https://journals.sagepub.com/action/showFeed?ui=0&mi=ehikzz&ai=2b4&jc=msx&type=etoc&feed=rss', enabled: true },
  ],
};

const CATEGORY_LABELS = {
  psychology: 'Psychology',
  neuroscience: 'Neuroscience', 
  perception: 'Perception',
  music: 'Music & Cognition',
};

// Calculate a basic pitch score based on keywords and recency
function calculatePitchScore(article) {
  let score = 50; // Base score
  
  // High-interest keywords boost score
  const highInterestKeywords = ['therapy', 'treatment', 'depression', 'anxiety', 'consciousness', 'decision', 'social', 'development', 'infant', 'culture', 'music', 'plasticity'];
  const mediumInterestKeywords = ['memory', 'learning', 'attention', 'emotion', 'perception', 'cognition', 'brain', 'neural'];
  
  const keywords = article.keywords || [];
  highInterestKeywords.forEach(kw => { if (keywords.includes(kw)) score += 8; });
  mediumInterestKeywords.forEach(kw => { if (keywords.includes(kw)) score += 4; });
  
  // Recency boost
  const daysSincePublished = (Date.now() - new Date(article.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublished < 7) score += 15;
  else if (daysSincePublished < 14) score += 10;
  else if (daysSincePublished < 30) score += 5;
  
  // Title length and complexity (longer, more specific titles often = more interesting research)
  if (article.title.length > 80) score += 5;
  if (article.title.includes(':')) score += 3; // Subtitles often indicate depth
  
  // Cap at 100
  return Math.min(100, Math.max(20, score));
}

// Suggest publications based on keywords and score
function suggestPublications(article) {
  const keywords = article.keywords || [];
  const suggestions = new Set();
  
  // General high-quality outlets
  if (article.pitchScore >= 85) {
    suggestions.add('The Atlantic');
    suggestions.add('Wired');
  }
  if (article.pitchScore >= 75) {
    suggestions.add('Scientific American');
    suggestions.add('Aeon');
  }
  
  // Topic-specific suggestions
  if (keywords.some(k => ['therapy', 'treatment', 'depression', 'anxiety', 'clinical'].includes(k))) {
    suggestions.add('STAT News');
    suggestions.add('Psychology Today');
  }
  if (keywords.some(k => ['music', 'rhythm', 'auditory', 'pitch'].includes(k))) {
    suggestions.add('The Conversation');
    suggestions.add('Psyche');
  }
  if (keywords.some(k => ['infant', 'child', 'development'].includes(k))) {
    suggestions.add('Scientific American Mind');
    suggestions.add('Quartz');
  }
  if (keywords.some(k => ['culture', 'social'].includes(k))) {
    suggestions.add('Nautilus');
    suggestions.add('Aeon');
  }
  if (keywords.some(k => ['brain', 'neural', 'cortex', 'consciousness'].includes(k))) {
    suggestions.add('Quanta Magazine');
    suggestions.add('Discover');
  }
  
  return Array.from(suggestions).slice(0, 5);
}

const PitchMeter = ({ score }) => {
  const getScoreColor = (s) => {
    if (s >= 85) return '#2d5a27';
    if (s >= 70) return '#8b6914';
    return '#6b5b5b';
  };
  const getScoreLabel = (s) => {
    if (s >= 85) return 'High potential';
    if (s >= 70) return 'Worth considering';
    return 'Niche appeal';
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e8e4df" strokeWidth="3"/>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(score)} strokeWidth="3" strokeDasharray={`${score}, 100`} style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
        </svg>
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '14px', color: getScoreColor(score) }}>{score}</span>
      </div>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: getScoreColor(score), fontWeight: '500' }}>{getScoreLabel(score)}</span>
    </div>
  );
};

const PreferenceButtons = ({ studyId, preferences, onPreferenceChange }) => {
  const pref = preferences[studyId] || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '16px' }}>
      <button onClick={(e) => { e.stopPropagation(); onPreferenceChange(studyId, pref === 1 ? 0 : 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: pref === 1 ? '#2d5a27' : '#c9c4bc', borderRadius: '4px' }} title="More like this">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={pref === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 5l8 14H4z"/></svg>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onPreferenceChange(studyId, pref === -1 ? 0 : -1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: pref === -1 ? '#8b4513' : '#c9c4bc', borderRadius: '4px' }} title="Less like this">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={pref === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 19l8-14H4z"/></svg>
      </button>
    </div>
  );
};

const StudyCard = ({ study, isExpanded, onToggle, preferences, onPreferenceChange }) => (
  <article style={{ borderBottom: '1px solid #d4cfc7', padding: '32px 0', cursor: 'pointer' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'start' }}>
      <div onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b4513', fontWeight: '600', background: 'linear-gradient(135deg, #faf6f1 0%, #f5ede3 100%)', padding: '4px 10px', borderRadius: '2px' }}>{study.journal}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#8a8580' }}>{new Date(study.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: '400', lineHeight: '1.35', color: '#1a1815', margin: '0 0 8px 0', maxWidth: '720px' }}>{study.title}</h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#6b6560', margin: '0 0 8px 0' }}>{study.authors}</p>
        {study.keywords && study.keywords.length > 0 && <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{study.keywords.slice(0, 4).map((kw, i) => <span key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: '#8a8580', background: '#f5f0e8', padding: '2px 8px', borderRadius: '10px' }}>{kw}</span>)}</div>}
      </div>
      <div onClick={onToggle}><PitchMeter score={study.pitchScore} /></div>
      <PreferenceButtons studyId={study.id} preferences={preferences} onPreferenceChange={onPreferenceChange} />
    </div>
    <div onClick={onToggle} style={{ maxHeight: isExpanded ? '800px' : '0', overflow: 'hidden', transition: 'max-height 0.4s ease, opacity 0.3s ease', opacity: isExpanded ? 1 : 0 }}>
      <div style={{ marginTop: '28px', paddingTop: '28px', borderTop: '1px dashed #d4cfc7' }}>
        {study.description && (
          <div style={{ background: 'linear-gradient(135deg, #fdfcfa 0%, #faf6f1 100%)', padding: '24px 28px', borderLeft: '3px solid #8b4513', marginBottom: '24px' }}>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '15px', lineHeight: '1.75', color: '#2c2825', margin: '0' }}>{study.description.slice(0, 500)}{study.description.length > 500 ? '...' : ''}</p>
          </div>
        )}
        {study.pitchScore >= 70 && study.suggestedPublications && study.suggestedPublications.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b6560', marginBottom: '12px', fontWeight: '600' }}>Potential Publications</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{study.suggestedPublications.map((pub, i) => <span key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#1a1815', background: '#fff', border: '1px solid #c9c4bc', padding: '6px 14px', borderRadius: '20px', fontWeight: '500' }}>{pub}</span>)}</div>
          </div>
        )}
        <a href={study.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#8b4513', textDecoration: 'none', fontWeight: '500' }}>Read full study <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg></a>
      </div>
    </div>
    <div onClick={onToggle} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a09a94', fontFamily: "'DM Sans', sans-serif", fontSize: '12px' }}>
      <span>{isExpanded ? 'Click to collapse' : 'Click to expand'}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}><path d="M6 9l6 6 6-6"/></svg>
    </div>
  </article>
);

const FeedConfigPanel = ({ feeds, setFeeds, customFeeds, setCustomFeeds, isOpen, onClose }) => {
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('psychology');
  
  const toggleFeed = (category, feedId) => setFeeds(prev => ({ ...prev, [category]: prev[category].map(f => f.id === feedId ? { ...f, enabled: !f.enabled } : f) }));
  const addCustomFeed = () => {
    if (newFeedUrl && newFeedName) {
      setCustomFeeds(prev => [...prev, { id: `custom-${Date.now()}`, name: newFeedName, url: newFeedUrl, enabled: true, category: newFeedCategory }]);
      setNewFeedUrl(''); setNewFeedName('');
    }
  };
  
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', background: '#fdfcfa', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 1000, overflow: 'auto' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #e8e4df', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fdfcfa' }}>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '24px', margin: 0, color: '#1a1815' }}>Feed Settings</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b6560' }}>×</button>
      </div>
      <div style={{ padding: '24px' }}>
        {Object.entries(feeds).map(([category, categoryFeeds]) => (
          <div key={category} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8b4513', marginBottom: '16px', fontWeight: '600' }}>{CATEGORY_LABELS[category]}</h3>
            {categoryFeeds.map(feed => (
              <label key={feed.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0ebe4', cursor: 'pointer' }}>
                <input type="checkbox" checked={feed.enabled} onChange={() => toggleFeed(category, feed.id)} style={{ width: '18px', height: '18px', accentColor: '#8b4513' }}/>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#1a1815' }}>{feed.name}</span>
              </label>
            ))}
            {customFeeds.filter(f => f.category === category).map(feed => (
              <div key={feed.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0ebe4' }}>
                <input type="checkbox" checked={feed.enabled} onChange={() => setCustomFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, enabled: !f.enabled } : f))} style={{ width: '18px', height: '18px', accentColor: '#8b4513' }}/>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#1a1815', flex: 1 }}>{feed.name}<span style={{ fontSize: '10px', color: '#8a8580', marginLeft: '8px', background: '#f5f0e8', padding: '2px 6px', borderRadius: '4px' }}>custom</span></span>
                <button onClick={() => setCustomFeeds(prev => prev.filter(f => f.id !== feed.id))} style={{ background: 'none', border: 'none', color: '#c9c4bc', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: '32px', padding: '20px', background: '#f5f0e8', borderRadius: '8px' }}>
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6b6560', marginBottom: '16px', fontWeight: '600' }}>Add Custom Feed</h3>
          <input type="text" placeholder="Feed name" value={newFeedName} onChange={(e) => setNewFeedName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4cfc7', borderRadius: '6px', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', boxSizing: 'border-box' }}/>
          <input type="url" placeholder="RSS feed URL" value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4cfc7', borderRadius: '6px', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', boxSizing: 'border-box' }}/>
          <select value={newFeedCategory} onChange={(e) => setNewFeedCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4cfc7', borderRadius: '6px', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', background: '#fff', boxSizing: 'border-box' }}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button onClick={addCustomFeed} disabled={!newFeedUrl || !newFeedName} style={{ width: '100%', padding: '12px', background: newFeedUrl && newFeedName ? '#1a1815' : '#d4cfc7', color: '#fff', border: 'none', borderRadius: '6px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: '500', cursor: newFeedUrl && newFeedName ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> Add Feed
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', color: '#8a8580' }}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
    <p style={{ marginTop: '16px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>Fetching latest research...</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div style={{ textAlign: 'center', padding: '64px 32px', color: '#8a8580' }}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c9c4bc" strokeWidth="2" style={{ marginBottom: '16px' }}>
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
    </svg>
    <p style={{ fontSize: '16px', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>{message}</p>
    <button onClick={onRetry} style={{ marginTop: '16px', padding: '10px 20px', background: '#1a1815', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>Try Again</button>
  </div>
);

export default function ResearchTracker() {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [feeds, setFeeds] = useState(DEFAULT_FEEDS);
  const [customFeeds, setCustomFeeds] = useState([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [studies, setStudies] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [fetchStats, setFetchStats] = useState(null);
  
  const enabledFeedCount = Object.values(feeds).flat().filter(f => f.enabled).length + customFeeds.filter(f => f.enabled).length;
  const handlePreferenceChange = (studyId, value) => setPreferences(prev => ({ ...prev, [studyId]: value }));
  
  // Fetch feeds from backend
  const fetchFeeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Collect all enabled feeds
    const enabledFeeds = [
      ...Object.values(feeds).flat().filter(f => f.enabled),
      ...customFeeds.filter(f => f.enabled),
    ];
    
    if (enabledFeeds.length === 0) {
      setError('No feeds enabled. Enable some feeds in settings.');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/fetch-feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: enabledFeeds }),
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to fetch feeds');
      
      // Process articles: add pitch scores and publication suggestions
      const processedArticles = data.articles.map(article => {
        const pitchScore = calculatePitchScore(article);
        return {
          ...article,
          pitchScore,
          suggestedPublications: suggestPublications({ ...article, pitchScore }),
        };
      });
      
      setStudies(processedArticles);
      setFetchStats({
        total: data.totalFeeds,
        successful: data.successfulFeeds,
        failed: data.failedFeeds,
        articles: data.totalArticles,
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to connect to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [feeds, customFeeds]);
  
  // Initial fetch on mount
  useEffect(() => {
    fetchFeeds();
  }, []); // Only on mount
  
  const filteredStudies = studies
    .filter(study => {
      if (filter === 'high') return study.pitchScore >= 85;
      if (filter === 'medium') return study.pitchScore >= 70 && study.pitchScore < 85;
      if (filter === 'liked') return preferences[study.id] === 1;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'score') return b.pitchScore - a.pitchScore;
      if (sortBy === 'preference') return (preferences[b.id] || 0) - (preferences[a.id] || 0);
      return 0;
    });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fdfcfa 0%, #f8f4ef 50%, #f5f0e8 100%)', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Instrument+Serif&family=Source+Serif+4:wght@400;500&display=swap" rel="stylesheet" />
      
      <header style={{ padding: '48px 0 40px', borderBottom: '1px solid #d4cfc7', background: 'linear-gradient(180deg, #fffef9 0%, #fdfcfa 100%)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#8b4513', borderRadius: '50%' }} />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8a8580', fontWeight: '600' }}>Research Tracker</span>
              </div>
              <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '400', color: '#1a1815', margin: '0 0 12px 0', lineHeight: '1.1' }}>The Science Brief</h1>
              <p style={{ fontSize: '15px', color: '#6b6560', margin: '0', maxWidth: '480px', lineHeight: '1.6' }}>Curated research summaries with freelance pitch potential scoring</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={fetchFeeds} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#fff', border: '1px solid #d4cfc7', borderRadius: '8px', cursor: isLoading ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#1a1815' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                {isLoading ? 'Fetching...' : 'Refresh'}
              </button>
              <button onClick={() => setConfigOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#1a1815', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#fff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                Feeds ({enabledFeedCount})
              </button>
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#a09a94', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {lastRefresh && <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>}
            {fetchStats && <span>•</span>}
            {fetchStats && <span>{fetchStats.successful}/{fetchStats.total} feeds, {fetchStats.articles} articles</span>}
            {fetchStats && fetchStats.failed.length > 0 && <span style={{ color: '#c9a227' }}>({fetchStats.failed.length} failed)</span>}
          </div>
        </div>
      </header>
      
      <nav style={{ position: 'sticky', top: '0', background: 'rgba(253, 252, 250, 0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e8e4df', zIndex: 100, padding: '16px 0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[{ key: 'all', label: 'All Studies' }, { key: 'high', label: 'High Potential' }, { key: 'medium', label: 'Worth Considering' }, { key: 'liked', label: 'Liked' }].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', padding: '8px 16px', border: filter === key ? '1px solid #1a1815' : '1px solid #d4cfc7', borderRadius: '24px', background: filter === key ? '#1a1815' : 'transparent', color: filter === key ? '#fff' : '#6b6560', cursor: 'pointer', fontWeight: '500' }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#8a8580' }}>Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', padding: '8px 12px', border: '1px solid #d4cfc7', borderRadius: '6px', background: '#fff', color: '#1a1815', cursor: 'pointer', fontWeight: '500' }}>
              <option value="date">Date</option>
              <option value="score">Pitch Score</option>
              <option value="preference">Your Preferences</option>
            </select>
          </div>
        </div>
      </nav>
      
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px 64px' }}>
        {isLoading && studies.length === 0 ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchFeeds} />
        ) : (
          <>
            <div style={{ padding: '20px 0 8px', color: '#8a8580', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Showing {filteredStudies.length} {filteredStudies.length === 1 ? 'study' : 'studies'}</span>
              <span style={{ fontSize: '11px' }}>Use ▲▼ to train your preferences</span>
            </div>
            {filteredStudies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 32px', color: '#8a8580' }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No studies match your current filter.</p>
                <p style={{ fontSize: '14px' }}>Try adjusting your filters or refreshing the feeds.</p>
              </div>
            ) : filteredStudies.map(study => (
              <StudyCard key={study.id} study={study} isExpanded={expandedId === study.id} onToggle={() => setExpandedId(expandedId === study.id ? null : study.id)} preferences={preferences} onPreferenceChange={handlePreferenceChange} />
            ))}
          </>
        )}
      </main>
      
      <footer style={{ borderTop: '1px solid #d4cfc7', padding: '32px', textAlign: 'center', background: '#faf6f1' }}>
        <p style={{ fontSize: '12px', color: '#8a8580', margin: '0' }}>Pitch scores based on topic novelty, public interest, and publication fit</p>
      </footer>
      
      <FeedConfigPanel feeds={feeds} setFeeds={setFeeds} customFeeds={customFeeds} setCustomFeeds={setCustomFeeds} isOpen={configOpen} onClose={() => setConfigOpen(false)} />
      {configOpen && <div onClick={() => setConfigOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999 }} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
