import json
import os
from openai import OpenAI
from typing import List, Dict, Any

class EmbeddingGenerator:
    """Generate embeddings for all market event titles for semantic search."""

    def __init__(self, openai_api_key: str = None):
        """Initialize OpenAI client."""
        self.client = OpenAI(api_key=openai_api_key or os.environ.get("OPENAI_API_KEY"))

    def load_events(self, kalshi_file: str, polymarket_file: str) -> List[Dict[str, Any]]:
        """Load events from both platforms."""
        print("Loading event data...")

        with open(kalshi_file, 'r') as f:
            kalshi_data = json.load(f)

        with open(polymarket_file, 'r') as f:
            polymarket_data = json.load(f)

        # Process Kalshi events
        kalshi_events = [
            {
                'title': event.get('title', ''),
                'platform': 'kalshi',
                'event_ticker': event.get('event_ticker', ''),
            }
            for event in kalshi_data.get('events', [])
            if event.get('title')
        ]

        # Process Polymarket events
        polymarket_events = [
            {
                'title': event.get('title', ''),
                'platform': 'polymarket',
                'event_ticker': event.get('slug') or event.get('id', ''),
            }
            for event in polymarket_data.get('events', [])
            if event.get('title')
        ]

        all_events = kalshi_events + polymarket_events
        print(f"Loaded {len(all_events)} events ({len(kalshi_events)} Kalshi, {len(polymarket_events)} Polymarket)")

        return all_events

    def generate_embeddings(self, events: List[Dict[str, Any]], batch_size: int = 100) -> List[Dict[str, Any]]:
        """Generate embeddings for all event titles using OpenAI's text-embedding-3-small model."""
        print(f"\nGenerating embeddings for {len(events)} events...")

        events_with_embeddings = []
        total_batches = (len(events) + batch_size - 1) // batch_size

        for i in range(0, len(events), batch_size):
            batch = events[i:i + batch_size]
            batch_num = (i // batch_size) + 1

            print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} events)...")

            try:
                # Get embeddings for this batch
                texts = [event['title'] for event in batch]
                response = self.client.embeddings.create(
                    model="text-embedding-3-small",
                    input=texts,
                    encoding_format="float"
                )

                # Add embeddings to events
                for j, event in enumerate(batch):
                    events_with_embeddings.append({
                        'title': event['title'],
                        'platform': event['platform'],
                        'event_ticker': event['event_ticker'],
                        'embedding': response.data[j].embedding
                    })

            except Exception as e:
                print(f"Error processing batch {batch_num}: {e}")
                # Continue with next batch

        print(f"\n✓ Generated {len(events_with_embeddings)} embeddings successfully")
        return events_with_embeddings

    def save_embeddings(self, events_with_embeddings: List[Dict[str, Any]], output_file: str):
        """Save embeddings to JSON file."""
        output_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            output_file
        )

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(events_with_embeddings, f, indent=2)

        file_size = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n✓ Embeddings saved to: {output_path}")
        print(f"File size: {file_size:.2f} MB")


def main():
    """Main function to generate and save embeddings."""
    print("=" * 70)
    print("🔍 EMBEDDING GENERATOR - Semantic Search for Market Events")
    print("=" * 70)
    print()

    # Check for OpenAI API key
    if not os.environ.get("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not found in environment variables")
        print("Please set it using: export OPENAI_API_KEY='your-key-here'")
        print()
        api_key = input("Or enter your OpenAI API key now: ").strip()
        if not api_key:
            print("❌ No API key provided. Exiting.")
            return
    else:
        api_key = None  # Will use env variable

    # Initialize generator
    generator = EmbeddingGenerator(api_key)

    # Determine data directory path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'data')

    # Load events
    events = generator.load_events(
        kalshi_file=os.path.join(data_dir, 'kalshi_events.json'),
        polymarket_file=os.path.join(data_dir, 'polymarket_events.json')
    )

    # Generate embeddings
    events_with_embeddings = generator.generate_embeddings(events, batch_size=100)

    # Save to file
    generator.save_embeddings(
        events_with_embeddings,
        os.path.join(data_dir, 'event_embeddings.json')
    )

    print("\n" + "=" * 70)
    print("✅ DONE!")
    print("=" * 70)
    print(f"\n📊 Generated embeddings for {len(events_with_embeddings)} events")
    print("\n📝 Next steps:")
    print("  1. The embeddings are saved in market-explorer/public/event_embeddings.json")
    print("  2. The frontend will use these for semantic search")
    print("  3. Cost: ~$0.0001 per 1K tokens (very cheap!)")


if __name__ == "__main__":
    main()
