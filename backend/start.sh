#!/bin/bash
set -e

echo "🚀 Starting Predict Pulse Backend..."

# Check if data files exist
if [ ! -f "data/event_embeddings.json" ]; then
    echo "📊 Data files not found. Generating..."

    echo "  [1/3] Fetching Kalshi markets..."
    python scripts/get_kalshi.py || echo "⚠️  Kalshi fetch failed"

    echo "  [2/3] Fetching Polymarket markets..."
    python scripts/get_polymarket.py || echo "⚠️  Polymarket fetch failed"

    echo "  [3/3] Generating embeddings..."
    python scripts/generate_embeddings.py || echo "⚠️  Embeddings generation failed"

    echo "✅ Data generation complete!"
else
    echo "✅ Data files found. Skipping generation."
fi

# Start the server
echo "🌐 Starting API server..."
node server.js
