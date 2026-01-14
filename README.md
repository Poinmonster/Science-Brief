# The Science Brief - Backend Service

A Node.js backend service that fetches and parses RSS feeds from scientific journals for the Science Brief research tracker app.

## Features

- 📡 Fetches RSS feeds from major psychology, neuroscience, perception, and music cognition journals
- 🔄 Parallel feed fetching for fast updates
- 🧹 Cleans HTML and extracts metadata (authors, DOIs, keywords)
- 🌐 CORS-enabled for frontend access
- ☁️ Deployable to Vercel, Netlify, or any Node.js host

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   cd science-brief-backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or for auto-reload during development:
   npm run dev
   ```

3. **Server runs at:** `http://localhost:3001`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/feeds` | GET | List available default feeds |
| `/api/fetch-all` | GET | Fetch all default feeds |
| `/api/fetch-all?categories=psychology,music` | GET | Fetch specific categories |
| `/api/fetch-feed` | POST | Fetch a single custom feed |
| `/api/fetch-feeds` | POST | Fetch multiple feeds |

### Example Requests

**Fetch all feeds:**
```bash
curl http://localhost:3001/api/fetch-all
```

**Fetch specific categories:**
```bash
curl "http://localhost:3001/api/fetch-all?categories=neuroscience,music"
```

**Fetch custom feed:**
```bash
curl -X POST http://localhost:3001/api/fetch-feed \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/feed.rss", "name": "My Feed"}'
```

**Fetch multiple feeds:**
```bash
curl -X POST http://localhost:3001/api/fetch-feeds \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [
      {"id": "feed1", "name": "Feed 1", "url": "https://example.com/feed1.rss"},
      {"id": "feed2", "name": "Feed 2", "url": "https://example.com/feed2.rss"}
    ]
  }'
```

## Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd science-brief-backend
   vercel
   ```

3. **Update frontend API_BASE_URL:**
   ```javascript
   const API_BASE_URL = 'https://your-app.vercel.app/api';
   ```

## Default Feeds Included

### Psychology
- Psychological Science
- Nature Human Behaviour
- Current Directions in Psychological Science

### Neuroscience
- Nature Neuroscience
- Nature Reviews Neuroscience
- Neuron
- Journal of Neuroscience
- Trends in Cognitive Sciences

### Perception
- Perception
- Auditory Perception & Cognition

### Music & Cognition
- Music Perception
- Psychology of Music
- Musicae Scientiae

## Response Format

```json
{
  "success": true,
  "totalFeeds": 10,
  "successfulFeeds": 9,
  "failedFeeds": [
    {"feedId": "...", "feedName": "...", "error": "..."}
  ],
  "totalArticles": 150,
  "articles": [
    {
      "id": "nat-neuro-0-1704825600000",
      "feedId": "nat-neuro",
      "title": "Article title...",
      "journal": "Nature Neuroscience",
      "authors": "Smith, J., Jones, A.",
      "date": "2025-01-10T00:00:00.000Z",
      "description": "Article abstract or description...",
      "link": "https://nature.com/articles/...",
      "doi": "10.1038/...",
      "keywords": ["neural", "plasticity", "cognition"],
      "summary": null,
      "context": null,
      "pitchScore": null,
      "suggestedPublications": null
    }
  ],
  "fetchedAt": "2025-01-14T12:00:00.000Z"
}
```

## Frontend Integration

The `frontend-with-api.jsx` file contains the updated React component that:
- Connects to this backend API
- Calculates pitch scores client-side
- Suggests target publications based on keywords
- Handles loading and error states

To use it:
1. Start the backend server
2. Update `API_BASE_URL` in the frontend if needed
3. Replace the existing `research-tracker.jsx` with `frontend-with-api.jsx`

## Next Steps

- [ ] Add AI summarization (Claude API) to generate summaries and context
- [ ] Implement preference learning based on user upvotes/downvotes
- [ ] Add caching layer (Redis) to reduce API calls
- [ ] Set up scheduled fetching (cron job)
- [ ] Add database persistence for articles and preferences

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **RSS Parsing:** rss-parser
- **Deployment:** Vercel (serverless) or any Node.js host

## License

MIT
