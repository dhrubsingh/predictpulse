#!/bin/bash

# Data Update Script for Predict Pulse
# This script fetches the latest market data and updates embeddings

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$(cd "$SCRIPT_DIR/../data" && pwd)"

echo "================================"
echo "Predict Pulse Data Update"
echo "Started at: $(date)"
echo "================================"

# Step 1: Fetch Kalshi data
echo ""
echo "[1/3] Fetching Kalshi markets..."
python3 "$SCRIPT_DIR/get_kalshi.py"
if [ $? -eq 0 ]; then
    echo "✓ Kalshi data updated successfully"
else
    echo "✗ Error fetching Kalshi data"
    exit 1
fi

# Step 2: Fetch Polymarket data
echo ""
echo "[2/3] Fetching Polymarket markets..."
python3 "$SCRIPT_DIR/get_polymarket.py"
if [ $? -eq 0 ]; then
    echo "✓ Polymarket data updated successfully"
else
    echo "✗ Error fetching Polymarket data"
    exit 1
fi

# Step 3: Generate embeddings
echo ""
echo "[3/3] Generating embeddings..."
python3 "$SCRIPT_DIR/generate_embeddings.py"
if [ $? -eq 0 ]; then
    echo "✓ Embeddings generated successfully"
else
    echo "✗ Error generating embeddings"
    exit 1
fi

echo ""
echo "================================"
echo "Data update completed at: $(date)"
echo "================================"

# Copy updated files to frontend public directory (if running in development)
if [ -d "../../public" ]; then
    echo ""
    echo "Copying data files to frontend..."
    cp "$DATA_DIR"/*.json ../../public/
    echo "✓ Data files copied to frontend"
fi
