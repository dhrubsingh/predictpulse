import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

class KalshiDataFetcher:
    """Fetches all events and markets from Kalshi API and stores them in a structured JSON file."""

    BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
        })

    def fetch_all_events(
        self,
        status: Optional[str] = None,
        with_nested_markets: bool = True,
        with_milestones: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch all events from Kalshi with pagination.

        Args:
            status: Filter by event status ('open', 'closed', 'settled'). None returns all.
            with_nested_markets: Include market data nested in each event.
            with_milestones: Include related milestones.

        Returns:
            Dictionary containing all events, markets, and metadata.
        """
        all_events = []
        all_milestones = []
        cursor = None
        page = 1

        print("Starting to fetch Kalshi events...")

        while True:
            # Build query parameters
            params = {
                'limit': 200,  # Maximum allowed
                'with_nested_markets': str(with_nested_markets).lower(),
                'with_milestones': str(with_milestones).lower(),
            }

            if cursor:
                params['cursor'] = cursor

            if status:
                params['status'] = status

            # Make API request
            try:
                print(f"Fetching page {page}...")
                response = self.session.get(
                    f"{self.BASE_URL}/events",
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()

                # Extract events and milestones
                events = data.get('events', [])
                milestones = data.get('milestones', [])
                cursor = data.get('cursor', '')

                all_events.extend(events)
                if milestones:
                    all_milestones.extend(milestones)

                print(f"  Retrieved {len(events)} events (Total so far: {len(all_events)})")

                # Check if we're done
                if not cursor or not events:
                    break

                page += 1

                # Rate limiting - be nice to the API
                time.sleep(0.5)

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"Response: {e.response.text}")
                break

        print(f"\nTotal events fetched: {len(all_events)}")

        return {
            'events': all_events,
            'milestones': all_milestones,
            'metadata': {
                'total_events': len(all_events),
                'total_milestones': len(all_milestones),
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'status_filter': status,
                'with_nested_markets': with_nested_markets,
            }
        }

    def save_to_json(self, data: Dict[str, Any], filename: str = 'kalshi_events.json'):
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
            'events_by_status': {},
            'events_by_series': {},
            'total_markets': 0,
            'markets_by_status': {},
            'total_volume': 0,
            'total_open_interest': 0,
        }

        for event in events:
            # Count events by status
            markets = event.get('markets', [])
            if markets:
                # Use first market's status as proxy for event status
                market_status = markets[0].get('status', 'unknown')
                summary['events_by_status'][market_status] = \
                    summary['events_by_status'].get(market_status, 0) + 1

            # Count events by series
            series_ticker = event.get('series_ticker', 'unknown')
            summary['events_by_series'][series_ticker] = \
                summary['events_by_series'].get(series_ticker, 0) + 1

            # Aggregate market data
            for market in markets:
                summary['total_markets'] += 1

                market_status = market.get('status', 'unknown')
                summary['markets_by_status'][market_status] = \
                    summary['markets_by_status'].get(market_status, 0) + 1

                summary['total_volume'] += market.get('volume', 0)
                summary['total_open_interest'] += market.get('open_interest', 0)

        return summary


def main():
    """Main function to fetch and save Kalshi data."""
    fetcher = KalshiDataFetcher()

    # Fetch all open events with nested markets
    print("=" * 60)
    print("KALSHI DATA FETCHER")
    print("=" * 60)

    # Fetch open events (currently tradeable)
    print("\nFetching OPEN events...")
    data = fetcher.fetch_all_events(
        status='open',
        with_nested_markets=True,
        with_milestones=True
    )

    # Generate and print summary
    summary = fetcher.generate_summary(data)
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(json.dumps(summary, indent=2))

    # Save to JSON
    fetcher.save_to_json(data, 'kalshi_events.json')

    # Also save summary separately for quick reference
    fetcher.save_to_json(summary, 'kalshi_summary.json')

    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)
    print("\nFiles created:")
    print("  - kalshi_events.json (complete data)")
    print("  - kalshi_summary.json (summary statistics)")
    print("\nYou can now use these files for:")
    print("  - Frontend rendering")
    print("  - LLM-based recommendations")
    print("  - Market analysis")


if __name__ == "__main__":
    main()
