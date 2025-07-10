import feedparser
import json
from datetime import datetime

def parse_multiple_rss_feeds():
    """Parse multiple RSS feeds and extract title and link from all posts"""
    
    # Hardcoded array of RSS feed URLs
    rss_feeds = [
        "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",        
        "https://www.fool.co.uk/feed/",
        "finance.yahoo.com/rss/2.0/headline-finance.xml",
        "https://feeds.feedburner.com/insidermonkey"
    ]
    
    all_posts = []
    
    for feed_url in rss_feeds:
        try:
            print(f"Parsing feed: {feed_url}")
            feed = feedparser.parse(feed_url)
            
            # Extract data from each entry
            for entry in feed.entries:
                post_data = {
                    "title": entry.title,
                    "link": entry.link,
                    "source": feed_url
                }
                all_posts.append(post_data)
                
        except Exception as e:
            print(f"Error parsing feed {feed_url}: {e}")
            continue
    
    # Write to JSON file
    output_file = "multi_rss_posts.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_posts, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully parsed {len(all_posts)} posts from {len(rss_feeds)} RSS feeds")
    print(f"Data saved to {output_file}")
    
    return all_posts

if __name__ == "__main__":
    parse_multiple_rss_feeds()