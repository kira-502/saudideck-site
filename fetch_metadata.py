import requests
from bs4 import BeautifulSoup
import json
import re
import os
from datetime import datetime

# Configuration
GAMES_JS_PATH = r"d:\ANTI-GRAVITY\saudideck-site\games.js"

MONTH_MAP = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
}

def clean_date_text(text):
    text = text.strip()
    
    # 1. Look for Exact Date (e.g., "5 Feb, 2026" or "Feb 28, 2025")
    # Steam format is often "DD MMM, YYYY"
    date_match = re.search(r'(\d{1,2})\s*([A-Za-z]{3})\w*,\s*(\d{4})', text)
    if date_match:
        day = date_match.group(1).zfill(2)
        month = MONTH_MAP.get(date_match.group(2).capitalize(), '01')
        year = date_match.group(3)
        return {"text": f"{day}/{month}/{year}", "type": "date"}

    # 2. Look for Year only (e.g., "2026")
    year_match = re.search(r'20\d{2}', text)
    if year_match and len(text) < 10:
        return {"text": f"EXPECTED: {year_match.group(0)}", "type": "expected"}

    # 3. Handle specific windows like "Q3 2025"
    window_match = re.search(r'(Q[1-4]|Summer|Winter|Late|Early)\s+20\d{2}', text, re.I)
    if window_match:
        return {"text": f"WINDOW: {window_match.group(0).upper()}", "type": "window"}

    # 4. Fallback
    if text and text.lower() != "coming soon":
        return {"text": f"WINDOW: {text[:20].upper()}", "type": "window"}
    
    return {"text": "TBA", "type": "window"}

def fetch_steam_search_date(game_title):
    search_url = f"https://store.steampowered.com/search/?term={game_title.replace(' ', '+')}"
    try:
        response = requests.get(search_url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find first search result's release date
        result = soup.find('div', class_='search_released')
        if result:
            raw_text = result.get_text().strip()
            print(f"Scraped for '{game_title}': {raw_text}")
            return clean_date_text(raw_text)
    except Exception as e:
        print(f"Error scraping {game_title}: {e}")
    return {"text": "TBA", "type": "window"}

def update_library():
    if not os.path.exists(GAMES_JS_PATH):
        print("games.js not found")
        return

    with open(GAMES_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the comingSoonGames array
    match = re.search(r'const comingSoonGames = \[(.*?)\];', content, re.DOTALL)
    if not match:
        return

    array_content = match.group(1)
    blocks = re.findall(r'\{.*?\}', array_content, re.DOTALL)
    
    updated_blocks = []
    for block in blocks:
        name_match = re.search(r'name: "(.*?)"', block)
        if not name_match:
            updated_blocks.append(block)
            continue
            
        game_name = name_match.group(1)
        metadata = fetch_steam_search_date(game_name)
        
        # Inject metadata
        block = re.sub(r',\s*release_info: ".*?"', '', block)
        block = re.sub(r',\s*release_type: ".*?"', '', block)
        
        new_fields = f', release_info: "{metadata["text"]}", release_type: "{metadata["type"]}"'
        updated_block = block.replace(' }', new_fields + ' }')
        updated_blocks.append(updated_block)

    new_array = ",\n    ".join(updated_blocks)
    new_content = content.replace(array_content, "\n    " + new_array + "\n")

    with open(GAMES_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("games.js successfully updated with formatted metadata.")

if __name__ == "__main__":
    update_library()
