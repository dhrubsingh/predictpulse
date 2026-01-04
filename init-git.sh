#!/bin/bash

# Initialize Git repository for Predict Pulse

set -e

echo "🚀 Initializing Git repository for Predict Pulse..."
echo ""

# Check if .git exists
if [ -d ".git" ]; then
    echo "⚠️  Git repository already exists!"
    read -p "Do you want to re-initialize? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -rf .git
fi

# Initialize git
echo "📦 Initializing Git..."
git init

# Add .env to gitignore if not already there
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "backend/.env" >> .gitignore
fi

# Stage all files
echo "📝 Staging files..."
git add .

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short
echo ""

# Ask for confirmation
read -p "Create initial commit? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git commit -m "Initial commit: Predict Pulse - AI prediction market explorer

- React frontend with Vite
- Express backend with Claude AI integration
- Python scripts for data fetching (Kalshi, Polymarket)
- OpenAI embeddings for semantic search
- GitHub Actions for automated data updates
- Comprehensive documentation"
    
    echo ""
    echo "✅ Initial commit created!"
    echo ""
    echo "Next steps:"
    echo "1. Create a GitHub repository"
    echo "2. Run: git remote add origin <your-repo-url>"
    echo "3. Run: git push -u origin main"
    echo "4. Add your OPENAI_API_KEY to GitHub Secrets for automated updates"
else
    echo "Commit skipped."
fi

echo ""
echo "📚 Documentation:"
echo "  - QUICK_START.md - Get started in 5 minutes"
echo "  - README.md - Full project documentation"
echo "  - DEPLOYMENT.md - Deploy to production"
echo "  - PROJECT_STRUCTURE.md - Understanding the codebase"
echo ""
echo "Happy coding! 🎉"
