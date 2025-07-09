import feedparser
import json
from datetime import datetime

def parse_dev_to_rss():
    """Parse dev.to RSS feed and extract title, description, and article link"""
    
    # Parse the RSS feed
    feed_url = "https://changelog.com/feed"
    feed = feedparser.parse(feed_url)
    
    # Extract data from each entry
    articles = []
    
    for entry in feed.entries:
        article_data = {
            "title": entry.title,            
            "link": entry.link
        }
        articles.append(article_data)
    
    # Write to JSON file
    output_file = "dev_to_articles.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully parsed {len(articles)} articles from dev.to RSS feed")
    print(f"Data saved to {output_file}")
    
    return articles

if __name__ == "__main__":
    parse_dev_to_rss()