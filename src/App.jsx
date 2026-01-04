import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, TrendingUp, DollarSign, Activity, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from './config';
import './App.css';

function App() {
  const [events, setEvents] = useState([]); // Combined Kalshi + Polymarket events
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [sortBy, setSortBy] = useState('liquidity'); // liquidity, volume, open_interest, probability, close_time
  const [viewMode, setViewMode] = useState('chat'); // 'search' or 'chat' - default to AI Assistant
  const [displayLimit, setDisplayLimit] = useState(30); // For infinite scroll
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [recommendedMarkets, setRecommendedMarkets] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    liked: [],
    dismissed: [],
    clicked: []
  });
  const chatMessagesEndRef = React.useRef(null);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 100); // Reduced to 100ms for faster response

    return () => clearTimeout(timer);
  }, [searchQuery]);
  // Load both Kalshi and Polymarket data
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        // Load Kalshi data
        const kalshiResponse = await fetch('/kalshi_events.json');
        const kalshiData = await kalshiResponse.json();

        // Load Polymarket data
        const polymarketResponse = await fetch('/polymarket_events.json');
        const polymarketData = await polymarketResponse.json();

        // Process Kalshi events
        const kalshiEvents = kalshiData.events?.map(event => ({
          ...event,
          platform: 'kalshi',
          markets: event.markets || [],
        })) || [];

        // Process Polymarket events
        const polymarketEvents = polymarketData.events?.map(event => ({
          ...event,
          platform: 'polymarket',
          event_ticker: event.slug || event.id,
          markets: event.markets?.map(market => ({
            ...market,
            ticker: market.id,
            status: market.active ? 'active' : 'closed',
            yes_sub_title: market.question,
            liquidity_dollars: parseFloat(market.liquidityNum || 0),
            volume: parseFloat(market.volumeNum || 0),
            open_interest: parseFloat(market.volumeNum || 0), // Polymarket doesn't have OI, using volume
            yes_ask_dollars: parseFloat(market.outcomePrices?.[0] || market.lastTradePrice || 0),
            no_ask_dollars: parseFloat(market.outcomePrices?.[1] || (1 - (market.lastTradePrice || 0))),
            close_time: market.endDate,
          })) || [],
        })) || [];

        // Combine both platforms
        const allEvents = [...kalshiEvents, ...polymarketEvents];
        setEvents(allEvents);
      } catch (err) {
        console.error('Error loading markets:', err);
      }
    };

    loadMarketData();
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('marketPreferences');
    if (savedPreferences) {
      setUserPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  // Save user preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('marketPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Calculate event-level metrics for ranking
  const calculateEventMetrics = useCallback((events) => {
    return events.map(event => {
      const activeMarkets = event.markets?.filter(m => m.status === 'active') || [];

      if (activeMarkets.length === 0) {
        return { ...event, metrics: null };
      }

      // Calculate raw metrics
      const totalLiquidity = activeMarkets.reduce((sum, m) =>
        sum + parseFloat(m.liquidity_dollars || 0), 0);
      const totalVolume = activeMarkets.reduce((sum, m) =>
        sum + (m.volume || 0), 0);
      const volume24h = activeMarkets.reduce((sum, m) =>
        sum + (m.volume_24h || 0), 0);
      const volumeVelocity = totalVolume > 0 ? volume24h / totalVolume : 0;

      const spreads = activeMarkets.map(m =>
        parseFloat(m.yes_ask_dollars || 0) - parseFloat(m.yes_bid_dollars || 0)
      ).filter(s => s > 0);
      const avgSpread = spreads.length > 0
        ? spreads.reduce((a, b) => a + b, 0) / spreads.length
        : 0;

      return {
        ...event,
        metrics: {
          totalLiquidity,
          totalVolume,
          volumeVelocity,
          avgSpread,
          marketCount: activeMarkets.length,
          // Composite score will be calculated after normalization
        }
      };
    }).filter(e => e.metrics !== null);
  }, []);

  // Normalize and rank events by composite score
  const rankEvents = useCallback((eventsWithMetrics) => {
    if (eventsWithMetrics.length === 0) return [];

    // Find min/max for normalization
    const liquidities = eventsWithMetrics.map(e => e.metrics.totalLiquidity);
    const velocities = eventsWithMetrics.map(e => e.metrics.volumeVelocity);
    const volumes = eventsWithMetrics.map(e => e.metrics.totalVolume);
    const spreads = eventsWithMetrics.map(e => e.metrics.avgSpread);

    const maxLiq = Math.max(...liquidities);
    const maxVel = Math.max(...velocities);
    const maxVol = Math.max(...volumes);
    const maxSpread = Math.max(...spreads);

    const normalize = (val, max) => max > 0 ? val / max : 0;

    // Calculate composite scores
    return eventsWithMetrics.map(event => {
      const normLiq = normalize(event.metrics.totalLiquidity, maxLiq);
      const normVel = normalize(event.metrics.volumeVelocity, maxVel);
      const normVol = normalize(event.metrics.totalVolume, maxVol);
      const normSpread = normalize(event.metrics.avgSpread, maxSpread);

      // Weighted composite: liquidity (35%) + velocity (25%) + volume (20%) + spread quality (10%) + market count (10%)
      const compositeScore =
        0.35 * normLiq +
        0.25 * normVel +
        0.20 * normVol +
        0.10 * (1 - normSpread) + // Lower spread is better
        0.10 * normalize(event.metrics.marketCount, 10); // Cap at 10 markets

      return {
        ...event,
        metrics: {
          ...event.metrics,
          compositeScore: compositeScore * 100 // Scale to 0-100
        }
      };
    }).sort((a, b) => b.metrics.compositeScore - a.metrics.compositeScore);
  }, []);

  // Handle chat message sending
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    // Add user message to chat
    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setIsLoadingChat(true);

    try {
      // Calculate metrics for all events
      // HYBRID SEARCH: Combine semantic + keyword search for best results

      // 1. Semantic search - get top 100 semantically similar events
      const semanticSearchResponse = await fetch(`${API_URL}/api/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          topK: 100 // Get top 100 from semantic search
        })
      });

      let semanticTickers = [];
      if (semanticSearchResponse.ok) {
        const { results } = await semanticSearchResponse.json();
        semanticTickers = results.map(r => r.event_ticker);
      }

      // Calculate metrics for all events
      const eventsWithMetrics = calculateEventMetrics(events);

      // 2. Keyword search - get events with exact keyword matches
      const keywords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const keywordMatches = eventsWithMetrics.filter(e => {
        const searchText = `${e.title} ${e.sub_title || ''}`.toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword));
      }).slice(0, 50); // Top 50 keyword matches

      const keywordTickers = keywordMatches.map(e => e.event_ticker);

      // 3. Merge: semantic + keyword (deduplicated)
      const combinedTickers = [...new Set([...semanticTickers, ...keywordTickers])];

      // Filter to only the relevant events (hybrid results)
      const relevantEvents = combinedTickers.length > 0
        ? eventsWithMetrics.filter(e => combinedTickers.includes(e.event_ticker))
        : eventsWithMetrics.slice(0, 150); // Fallback if both fail

      // Rank the relevant events by composite score
      const rankedEvents = rankEvents(relevantEvents);

      // Take top events for detailed analysis
      const diverseTopEvents = rankedEvents.slice(0, 150);

      // Send only the filtered/ranked events (from hybrid search) to Claude
      // This is much more efficient than sending all events
      const allEventTitles = rankedEvents.map(e => ({
        title: e.title,
        platform: e.platform,
        event_ticker: e.event_ticker
      }));

      // Send to AI backend with event-level context
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: newMessages,
          allEventTitles, // ALL event titles for scanning
          rankedEvents: diverseTopEvents.map(e => ({
            title: e.title,
            platform: e.platform,
            event_ticker: e.event_ticker,
            metrics: {
              totalLiquidity: e.metrics.totalLiquidity,
              totalVolume: e.metrics.totalVolume,
              volumeVelocity: e.metrics.volumeVelocity,
              marketCount: e.metrics.marketCount,
              compositeScore: e.metrics.compositeScore
            }
          })),
          userPreferences
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Add AI response to chat
        setChatMessages([...newMessages, {
          role: 'assistant',
          content: data.response
        }]);

        // Update recommended markets - show top semantically similar events
        let recommendedEvents = [];

        if (data.recommendedMarkets && data.recommendedMarkets.length > 0) {
          console.log(`Received ${data.recommendedMarkets.length} recommendations from AI:`, data.recommendedMarkets);

          // Use AI's explicit recommendations if provided - search in ranked events
          recommendedEvents = data.recommendedMarkets
            .map(rec => {
              const event = rankedEvents.find(e => e.event_ticker === rec.eventTicker);
              if (!event) {
                console.warn(`Could not find event for ticker: ${rec.eventTicker}`);
                console.warn(`This event may not have been in the search results.`);
                return null;
              }
              return {
                ...rec,
                compositeScore: event.metrics?.compositeScore || 0
              };
            })
            .filter(Boolean);

          console.log(`Successfully mapped ${recommendedEvents.length} events out of ${data.recommendedMarkets.length} recommendations`);
        } else {
          // Default: Show top 5 events from semantic search, ranked by quality score
          recommendedEvents = rankedEvents.slice(0, 5).map(event => ({
            eventTicker: event.event_ticker,
            reason: "Semantically relevant and high quality",
            compositeScore: event.metrics?.compositeScore || 0
          }));
        }

        // Sort by composite score (quality ranking)
        recommendedEvents.sort((a, b) => b.compositeScore - a.compositeScore);
        console.log(`Displaying ${recommendedEvents.length} recommended markets`);
        setRecommendedMarkets(recommendedEvents);
      } else {
        setChatMessages([...newMessages, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the AI. Please try again.'
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Handle market interactions for learning
  const handleMarketLike = useCallback((eventTicker) => {
    setUserPreferences(prev => ({
      ...prev,
      liked: [...new Set([...prev.liked, eventTicker])],
      dismissed: prev.dismissed.filter(t => t !== eventTicker)
    }));
  }, []);

  const handleMarketDismiss = useCallback((eventTicker) => {
    setUserPreferences(prev => ({
      ...prev,
      dismissed: [...new Set([...prev.dismissed, eventTicker])],
      liked: prev.liked.filter(t => t !== eventTicker)
    }));
    setRecommendedMarkets(prev => prev.filter(m => m.eventTicker !== eventTicker));
  }, []);

  const handleMarketClick = useCallback((eventTicker) => {
    setUserPreferences(prev => ({
      ...prev,
      clicked: [...new Set([...prev.clicked, eventTicker])]
    }));
  }, []);

  // Setup optimized fuzzy search on events
  const fuse = useMemo(() => {
    return new Fuse(events, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'sub_title', weight: 2 },
        { name: 'series_ticker', weight: 1.5 },
        { name: 'markets.yes_sub_title', weight: 1.5 },
      ],
      threshold: 0.3, // Slightly higher threshold for faster, more precise matches
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2, // Skip very short matches for better performance
      // Removed findAllMatches for better performance
    });
  }, [events]);

  // Memoize best market calculation per event
  const eventCache = useMemo(() => {
    const cache = new Map();

    events.forEach(event => {
      if (!event.markets || event.markets.length === 0) {
        cache.set(event.event_ticker, { bestMarket: null, stats: null });
        return;
      }

      const activeMarkets = event.markets.filter(m => m.status === 'active');

      let bestMarket = null;
      if (activeMarkets.length > 0) {
        bestMarket = activeMarkets.reduce((best, current) => {
          const currentLiq = parseFloat(current.liquidity_dollars || 0);
          const bestLiq = parseFloat(best.liquidity_dollars || 0);
          return currentLiq > bestLiq ? current : best;
        }, activeMarkets[0]);
      } else {
        bestMarket = event.markets[0];
      }

      const stats = {
        totalLiquidity: activeMarkets.reduce((sum, m) => sum + parseFloat(m.liquidity_dollars || 0), 0),
        totalVolume: activeMarkets.reduce((sum, m) => sum + (m.volume || 0), 0),
        totalOpenInterest: activeMarkets.reduce((sum, m) => sum + (m.open_interest || 0), 0),
        marketCount: activeMarkets.length,
      };

      cache.set(event.event_ticker, { bestMarket, stats });
    });

    return cache;
  }, [events]);

  // Get best market for an event (now uses cache)
  const getBestMarket = useCallback((event) => {
    return eventCache.get(event.event_ticker)?.bestMarket || null;
  }, [eventCache]);

  // Get aggregated stats for an event (now uses cache)
  const getEventStats = useCallback((event) => {
    return eventCache.get(event.event_ticker)?.stats ||
      { totalLiquidity: 0, totalVolume: 0, totalOpenInterest: 0, marketCount: 0 };
  }, [eventCache]);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let results = events;

    // Apply search
    if (debouncedSearchQuery.trim()) {
      const searchResults = fuse.search(debouncedSearchQuery);
      results = searchResults.map(result => result.item);
    }

    // Filter out events without active markets
    results = results.filter(event => {
      const cached = eventCache.get(event.event_ticker);
      return cached && cached.bestMarket;
    });

    // Sort based on selected sort option
    const now = Date.now();
    return results.sort((a, b) => {
      const cachedA = eventCache.get(a.event_ticker);
      const cachedB = eventCache.get(b.event_ticker);

      if (!cachedA || !cachedB) return 0;

      const marketA = cachedA.bestMarket;
      const marketB = cachedB.bestMarket;

      switch (sortBy) {
        case 'liquidity':
          return parseFloat(marketB.liquidity_dollars || 0) - parseFloat(marketA.liquidity_dollars || 0);

        case 'volume':
          return (marketB.volume || 0) - (marketA.volume || 0);

        case 'open_interest':
          return (marketB.open_interest || 0) - (marketA.open_interest || 0);

        case 'probability':
          const probA = parseFloat(marketA.yes_bid_dollars || 0) * 100;
          const probB = parseFloat(marketB.yes_bid_dollars || 0) * 100;
          return probB - probA;

        case 'close_time':
          const timeA = new Date(marketA.close_time).getTime() - now;
          const timeB = new Date(marketB.close_time).getTime() - now;
          return timeA - timeB; // Soonest first

        default:
          return parseFloat(marketB.liquidity_dollars || 0) - parseFloat(marketA.liquidity_dollars || 0);
      }
    });
  }, [events, debouncedSearchQuery, sortBy, fuse, eventCache]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (viewMode !== 'search') return;

      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500;

      if (scrolledToBottom && displayLimit < filteredEvents.length) {
        setDisplayLimit(prev => Math.min(prev + 30, filteredEvents.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode, displayLimit, filteredEvents.length]);

  // Reset display limit when search changes
  useEffect(() => {
    setDisplayLimit(30);
  }, [debouncedSearchQuery]);

  return (
    <div className="app">
      {/* Hero Section with Search */}
      <div className={`hero ${viewMode === 'search' || viewMode === 'chat' ? 'compact' : ''}`}>
        <div className="hero-content">
          <h1 className="title">Predict Pulse</h1>
          <p className="subtitle">
            {viewMode === 'search' ? 'Search across prediction markets on Kalshi & Polymarket' : 'AI-powered market recommendations tailored to you'}
          </p>

          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'search' ? 'active' : ''}`}
              onClick={() => setViewMode('search')}
            >
              <Search size={18} />
              Search Markets
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'chat' ? 'active' : ''}`}
              onClick={() => setViewMode('chat')}
            >
              <TrendingUp size={18} />
              AI Assistant
            </button>
          </div>

          {viewMode === 'search' && (
            <div className="search-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="Search events... (e.g., 'Bitcoin', 'Election', 'Temperature')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {viewMode === 'search' && (
            <div className="sort-container">
            <label htmlFor="sort-select" className="sort-label">Sort by:</label>
            <select
              id="sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="liquidity">Highest Liquidity</option>
              <option value="volume">Highest Volume</option>
              <option value="open_interest">Highest Open Interest</option>
              <option value="probability">Highest Probability</option>
              <option value="close_time">Closing Soonest</option>
            </select>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {viewMode === 'search' && (
        <div className="results-container">
          <div className="results-header">
            <p className="results-count">
              {debouncedSearchQuery ? (
                <>
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                  {searchQuery !== debouncedSearchQuery && <span className="searching-indicator"> (searching...)</span>}
                </>
              ) : (
                <>Showing {Math.min(displayLimit, filteredEvents.length)} of {filteredEvents.length} markets</>
              )}
            </p>
          </div>

          <div className="events-grid">
            {filteredEvents.slice(0, displayLimit).map(event => (
              <EventCard
                key={event.event_ticker}
                event={event}
                bestMarket={getBestMarket(event)}
                stats={getEventStats(event)}
                isExpanded={expandedEvent === event.event_ticker}
                onToggle={() => setExpandedEvent(expandedEvent === event.event_ticker ? null : event.event_ticker)}
              />
            ))}
          </div>

          {displayLimit < filteredEvents.length && (
            <div className="load-more-notice">
              Scroll down for more markets...
            </div>
          )}

          {filteredEvents.length === 0 && debouncedSearchQuery && (
            <div className="no-results">
              <p>No events found matching your search</p>
            </div>
          )}
        </div>
      )}

      {/* AI Chat View */}
      {viewMode === 'chat' && (
        <div className="chat-container">
          <div className="chat-layout">
            {/* Chat Messages */}
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-welcome">
                  <h2>👋 Hi! I'm your AI market assistant</h2>
                  <p>Tell me what you're interested in and I'll recommend markets that match your interests.</p>
                  <div className="chat-suggestions">
                    <button onClick={() => setChatInput("I'm interested in crypto markets")}>
                      Crypto markets
                    </button>
                    <button onClick={() => setChatInput("Show me political prediction markets")}>
                      Political markets
                    </button>
                    <button onClick={() => setChatInput("What are the most liquid markets?")}>
                      High liquidity markets
                    </button>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, index) => (
                <React.Fragment key={index}>
                  <div className={`chat-message ${msg.role}`}>
                    <div className="message-content">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({children}) => {
                              // Convert bullet points (•) to proper list items
                              const text = String(children);
                              if (text.includes('•')) {
                                const items = text.split('•').filter(item => item.trim());
                                return (
                                  <ul>
                                    {items.map((item, i) => (
                                      <li key={i}>{item.trim()}</li>
                                    ))}
                                  </ul>
                                );
                              }
                              return <p>{children}</p>;
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>

                  {/* Show recommended markets inline after the last assistant message */}
                  {msg.role === 'assistant' &&
                   index === chatMessages.length - 1 &&
                   recommendedMarkets.length > 0 && (
                    <div className="inline-recommendations">
                      <div className="inline-recommendations-title">Recommended Markets</div>
                      <div className="inline-markets-scroll">
                        {recommendedMarkets.map((market) => {
                          const event = events.find(e => e.event_ticker === market.eventTicker);
                          if (!event) return null;

                          const activeMarkets = event.markets?.filter(m => m.status === 'active') || [];
                          if (activeMarkets.length === 0) return null;

                          const totalLiquidity = activeMarkets.reduce((sum, m) => sum + parseFloat(m.liquidity_dollars || 0), 0);
                          const totalVolume = activeMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

                          const formatCurrency = (num) => {
                            if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
                            if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
                            return `$${num.toFixed(0)}`;
                          };

                          const getEventUrl = () => {
                            if (event.platform === 'polymarket') {
                              return `https://polymarket.com/event/${event.event_ticker}`;
                            }
                            return `https://kalshi.com/events/${event.event_ticker}`;
                          };

                          return (
                            <a
                              key={market.eventTicker}
                              href={getEventUrl()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-market-card"
                              onClick={() => handleMarketClick(market.eventTicker)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span className={`platform-badge ${event.platform}`}>
                                  {event.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="action-btn like"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarketLike(market.eventTicker);
                                    }}
                                    title="I like this"
                                    style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    👍
                                  </button>
                                  <button
                                    className="action-btn dismiss"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarketDismiss(market.eventTicker);
                                    }}
                                    title="Not interested"
                                    style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                                {event.title}
                              </h4>
                              {event.sub_title && (
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                  {event.sub_title}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Liquidity</span>
                                  <span style={{ fontWeight: 600 }}>{formatCurrency(totalLiquidity)}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Volume</span>
                                  <span style={{ fontWeight: 600 }}>{formatCurrency(totalVolume)}</span>
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Markets</span>
                                  <span style={{ fontWeight: 600 }}>{activeMarkets.length}</span>
                                </div>
                              </div>
                              {market.reason && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                  <strong>Why:</strong> {market.reason}
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {isLoadingChat && (
                <div className="chat-message assistant">
                  <div className="message-content loading">
                    <span className="loading-spinner"></span>
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={chatMessagesEndRef} />
            </div>

            {/* Recommended Markets Sidebar */}
            {recommendedMarkets.length > 0 && (
              <div className="recommended-markets">
                <h3 className="recommendations-title">Recommended Markets</h3>
                <div className="recommendations-list">
                  {recommendedMarkets.map((market) => (
                    <RecommendedMarketCard
                      key={market.eventTicker}
                      market={market}
                      events={events}
                      onLike={handleMarketLike}
                      onDismiss={handleMarketDismiss}
                      onClick={handleMarketClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Tell me what markets you're looking for..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              disabled={isLoadingChat}
            />
            <button
              className="chat-send-btn"
              onClick={sendChatMessage}
              disabled={isLoadingChat || !chatInput.trim()}
            >
              Send
            </button>
          </div>

          {/* Ranking Methodology Footer */}
          <div className="ranking-footer">
            <div className="ranking-footer-content">
              <h4>How Events Are Ranked</h4>
              <p>Events are scored 0-100 based on:</p>
              <div className="ranking-factors">
                <span className="ranking-factor-item">
                  <strong>35%</strong> Liquidity
                  <span className="ranking-factor-tooltip">Total capital available - can you execute trades?</span>
                </span>
                <span className="ranking-factor-item">
                  <strong>25%</strong> Volume Velocity
                  <span className="ranking-factor-tooltip">Recent trading activity - is it hot right now?</span>
                </span>
                <span className="ranking-factor-item">
                  <strong>20%</strong> Total Volume
                  <span className="ranking-factor-tooltip">Historical trading volume - proven market interest</span>
                </span>
                <span className="ranking-factor-item">
                  <strong>10%</strong> Spread Quality
                  <span className="ranking-factor-tooltip">Bid-ask spread - lower execution costs</span>
                </span>
                <span className="ranking-factor-item">
                  <strong>10%</strong> Market Count
                  <span className="ranking-factor-tooltip">Number of active markets - more betting options</span>
                </span>
              </div>
              <p className="ranking-note">Higher scores indicate better execution quality and active trading.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recommended Event Card Component
const RecommendedMarketCard = React.memo(({ market, events, onLike, onDismiss, onClick }) => {
  const event = events.find(e => e.event_ticker === market.eventTicker);
  if (!event) return null;

  const activeMarkets = event.markets?.filter(m => m.status === 'active') || [];
  if (activeMarkets.length === 0) return null;

  // Calculate event-level stats
  const totalLiquidity = activeMarkets.reduce((sum, m) => sum + parseFloat(m.liquidity_dollars || 0), 0);
  const totalVolume = activeMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const marketCount = activeMarkets.length;

  const formatCurrency = (num) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const getEventUrl = (ticker, platform) => {
    if (platform === 'polymarket') {
      // Use event slug for Polymarket
      return `https://polymarket.com/event/${ticker}`;
    }
    // Use event ticker for Kalshi
    return `https://kalshi.com/events/${ticker}`;
  };

  return (
    <div className="recommended-card">
      <div className="recommended-header">
        <span className={`platform-badge ${event.platform}`}>
          {event.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
        </span>
        <div className="recommended-actions">
          <button
            className="action-btn like"
            onClick={(e) => {
              e.stopPropagation();
              onLike(market.eventTicker);
            }}
            title="I like this"
          >
            👍
          </button>
          <button
            className="action-btn dismiss"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(market.eventTicker);
            }}
            title="Not interested"
          >
            ✕
          </button>
        </div>
      </div>

      <a
        href={getEventUrl(event.event_ticker, event.platform)}
        target="_blank"
        rel="noopener noreferrer"
        className="recommended-content"
        onClick={() => onClick(market.eventTicker)}
      >
        <h4 className="recommended-title">{event.title}</h4>
        {event.sub_title && <p className="recommended-subtitle">{event.sub_title}</p>}

        <div className="recommended-stats">
          <div className="stat">
            <span className="stat-label">Liquidity</span>
            <span className="stat-value">{formatCurrency(totalLiquidity)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Volume</span>
            <span className="stat-value">{formatCurrency(totalVolume)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Markets</span>
            <span className="stat-value">{marketCount}</span>
          </div>
        </div>

        {market.reason && (
          <div className="recommendation-reason">
            <strong>Why:</strong> {market.reason}
          </div>
        )}
      </a>
    </div>
  );
});

// Tooltip component
const Tooltip = ({ children, text }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <span className="tooltip-popup">{text}</span>}
    </span>
  );
};

// Memoize EventCard to prevent unnecessary re-renders
const EventCard = React.memo(({ event, bestMarket, stats, isExpanded, onToggle }) => {
  if (!bestMarket) return null;

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const getMarketUrl = () => {
    if (event.platform === 'polymarket') {
      // Use event slug for Polymarket
      return `https://polymarket.com/event/${event.event_ticker}`;
    }
    // Use event ticker for Kalshi
    return `https://kalshi.com/events/${event.event_ticker}`;
  };

  return (
    <div className="event-card" onClick={onToggle}>
      <div className="event-header">
        <div className="event-title-group">
          <div className="event-title-row">
            <h3 className="event-title">{event.title}</h3>
            <span className={`platform-badge ${event.platform}`}>
              {event.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}
            </span>
          </div>
          {event.sub_title && <p className="event-subtitle">{event.sub_title}</p>}

          {/* Compact stats under event title */}
          <div className="event-stats-compact">
            <Tooltip text="Liquidity">
              <span className="stat-compact">
                <DollarSign size={12} />
                {formatCurrency(parseFloat(bestMarket.liquidity_dollars || 0))}
              </span>
            </Tooltip>
            <Tooltip text="Volume">
              <span className="stat-compact">
                <Activity size={12} />
                {formatNumber(bestMarket.volume || 0)}
              </span>
            </Tooltip>
            <Tooltip text="Open Interest">
              <span className="stat-compact">
                <TrendingUp size={12} />
                {formatNumber(bestMarket.open_interest || 0)}
              </span>
            </Tooltip>
            <Tooltip text="Closes">
              <span className="stat-compact">
                <Clock size={12} />
                {Math.ceil((new Date(bestMarket.close_time) - new Date()) / (1000 * 60 * 60 * 24))}d
              </span>
            </Tooltip>
          </div>
        </div>

        {stats.marketCount > 1 && (
          <div className="market-count">
            {stats.marketCount} markets
          </div>
        )}
      </div>

      {/* Market question - prominent */}
      <div className="market-question">
        <h4 className="market-question-title">{bestMarket.yes_sub_title}</h4>
        <div className="probability-display">
          {(parseFloat(bestMarket.yes_bid_dollars || 0) * 100).toFixed(1)}%
        </div>
      </div>

      <div className="event-footer">
        <div className="price-display">
          <a
            href={getMarketUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="price-item yes"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="price-label">YES</span>
            <span className="price-value">${parseFloat(bestMarket.yes_ask_dollars || 0).toFixed(2)}</span>
          </a>
          <a
            href={getMarketUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="price-item no"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="price-label">NO</span>
            <span className="price-value">${parseFloat(bestMarket.no_ask_dollars || 0).toFixed(2)}</span>
          </a>
        </div>

        {stats.marketCount > 1 && (
          <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {isExpanded ? 'Show less' : 'Show all markets'}
          </button>
        )}
      </div>

      {/* Expanded Markets View */}
      {isExpanded && stats.marketCount > 1 && (
        <div className="markets-expanded" onClick={(e) => e.stopPropagation()}>
          <h4 className="markets-expanded-title">All Markets</h4>
          <div className="markets-list">
            {event.markets
              .filter(m => m.status === 'active')
              .sort((a, b) => parseFloat(b.liquidity_dollars || 0) - parseFloat(a.liquidity_dollars || 0))
              .map(market => (
                <MarketRow key={market.ticker} market={market} platform={event.platform} eventTicker={event.event_ticker} formatNumber={formatNumber} formatCurrency={formatCurrency} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
});

const MarketRow = React.memo(({ market, platform, eventTicker, formatNumber, formatCurrency }) => {
  const getMarketUrl = () => {
    if (platform === 'polymarket') {
      // Use event slug for Polymarket
      return `https://polymarket.com/event/${eventTicker}`;
    }
    // Use event ticker for Kalshi
    return `https://kalshi.com/events/${eventTicker}`;
  };

  return (
    <a
      href={getMarketUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="market-row"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="market-row-header">
        <div className="market-row-title">{market.yes_sub_title}</div>
        <div className="market-row-probability">
          {(parseFloat(market.yes_bid_dollars || 0) * 100).toFixed(1)}%
        </div>
      </div>
      <div className="market-row-stats">
        <span>Liq: {formatCurrency(parseFloat(market.liquidity_dollars || 0))}</span>
        <span>Vol: {formatNumber(market.volume || 0)}</span>
        <span>OI: {formatNumber(market.open_interest || 0)}</span>
      </div>
      <div className="market-row-prices">
        <span className="yes-price">YES ${parseFloat(market.yes_ask_dollars || 0).toFixed(2)}</span>
        <span className="no-price">NO ${parseFloat(market.no_ask_dollars || 0).toFixed(2)}</span>
      </div>
    </a>
  );
});

export default App;
