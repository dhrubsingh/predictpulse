import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

class PolymarketDataFetcher:
    """Fetches all events and markets from Polymarket API and stores them in a structured JSON file."""

    BASE_URL = "https://gamma-api.polymarket.com"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
        })

    def fetch_all_events(
        self,
        active_only: bool = True,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Fetch all events from Polymarket with pagination.

        Args:
            active_only: Filter to only active markets (not closed/archived)
            limit: Number of events per page (max 100)

        Returns:
            Dictionary containing all events, markets, and metadata.
        """
        all_events = []
        offset = 0
        page = 1

        print("Starting to fetch Polymarket events...")

        while True:
            # Build query parameters
            params = {
                'limit': min(limit, 100),  # API max is 100
                'offset': offset,
            }

            if active_only:
                params['active'] = 'true'
                params['closed'] = 'false'
                params['archived'] = 'false'

            # Make API request
            try:
                print(f"Fetching page {page} (offset {offset})...")
                response = self.session.get(
                    f"{self.BASE_URL}/events",
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                events = response.json()

                if not events or len(events) == 0:
                    print("No more events found.")
                    break

                all_events.extend(events)
                print(f"  Retrieved {len(events)} events (Total so far: {len(all_events)})")

                # Check if we got fewer results than requested (last page)
                if len(events) < limit:
                    break

                offset += limit
                page += 1

                # Rate limiting - be nice to the API
                time.sleep(0.5)

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"Response: {e.response.text}")
                break

        print(f"\nTotal events fetched: {len(all_events)}")

        # Count total markets across all events
        total_markets = sum(len(event.get('markets', [])) for event in all_events)
        print(f"Total markets across events: {total_markets}")

        return {
            'events': all_events,
            'metadata': {
                'total_events': len(all_events),
                'total_markets': total_markets,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'active_only': active_only,
                'source': 'Polymarket',
            }
        }

    def save_to_json(self, data: Dict[str, Any], filename: str = 'polymarket_events.json'):
        """Save the fetched data to a JSON file."""
        import os

        # Get the script directory and construct path to data directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        filepath = os.path.join(data_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\nData saved to: {filepath}")
        print(f"File size: {self._get_file_size(filepath)}")

    def _get_file_size(self, filepath: str) -> str:
        """Get human-readable file size."""
        import os
        size = os.path.getsize(filepath)
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"

    def generate_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a summary of the fetched data for easy analysis."""
        events = data.get('events', [])

        summary = {
            'total_events': len(events),
            'events_by_status': {
                'active': 0,
                'closed': 0,
                'archived': 0,
            },
            'events_by_category': {},
            'total_markets': 0,
            'total_volume': 0,
            'total_liquidity': 0,
            'total_open_interest': 0,
            'markets_with_liquidity': 0,
        }

        for event in events:
            # Count by status
            if event.get('active'):
                summary['events_by_status']['active'] += 1
            if event.get('closed'):
                summary['events_by_status']['closed'] += 1
            if event.get('archived'):
                summary['events_by_status']['archived'] += 1

            # Count by category
            category = event.get('category', 'Unknown')
            summary['events_by_category'][category] = \
                summary['events_by_category'].get(category, 0) + 1

            # Aggregate event-level metrics
            summary['total_volume'] += float(event.get('volume', 0) or 0)
            summary['total_liquidity'] += float(event.get('liquidity', 0) or 0)
            summary['total_open_interest'] += float(event.get('openInterest', 0) or 0)

            # Count markets
            markets = event.get('markets', [])
            summary['total_markets'] += len(markets)

            # Count markets with liquidity
            for market in markets:
                if float(market.get('liquidityNum', 0) or 0) > 0:
                    summary['markets_with_liquidity'] += 1

        return summary


def main():
    """Main function to fetch and save Polymarket data."""
    fetcher = PolymarketDataFetcher()

    print("=" * 60)
    print("POLYMARKET DATA FETCHER")
    print("=" * 60)

    # Fetch active events
    print("\nFetching ACTIVE events and markets...")
    data = fetcher.fetch_all_events(
        active_only=True,
        limit=100
    )

    # Generate and print summary
    summary = fetcher.generate_summary(data)
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(json.dumps(summary, indent=2))

    # Save to JSON
    fetcher.save_to_json(data, 'polymarket_events.json')

    # Also save summary separately for quick reference
    fetcher.save_to_json(summary, 'polymarket_summary.json')

    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)
    print("\nFiles created:")
    print("  - polymarket_events.json (complete data)")
    print("  - polymarket_summary.json (summary statistics)")
    print("\nYou can now use these files for:")
    print("  - Arbitrage detection across Kalshi and Polymarket")
    print("  - Market comparison and analysis")
    print("  - Price discrepancy identification")


if __name__ == "__main__":
    main()
