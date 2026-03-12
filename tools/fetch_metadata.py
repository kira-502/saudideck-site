import requests
import re
import os
import time

# Configuration
GAMES_JS_PATH = r"d:\ANTI-GRAVITY\saudideck-site\games.js"

def parse_steam_date(raw_date):
    """
    Steam returns dates in various localized formats like "10 Sep, 2013" or "Sep 10, 2013".
    This normalizes them to your strict DD/MM/YYYY format.
    """
    try:
        # Remove commas and split into components
        parts = raw_date.replace(',', '').split()
        if len(parts) >= 3:
            months = {
                'Jan':'01', 'Feb':'02', 'Mar':'03', 'Apr':'04',
                'May':'05', 'Jun':'06', 'Jul':'07', 'Aug':'08',
                'Sep':'09', 'Oct':'10', 'Nov':'11', 'Dec':'12'
            }
            
            # Check if the first part is the day (e.g., "10 Sep 2013")
            if parts[0].isdigit():
                day = int(parts[0])
                month = months.get(parts[1][:3], '01')
                year = parts[2]
            # Otherwise it's the month (e.g., "Sep 10 2013")
            else:
                month = months.get(parts[0][:3], '01')
                day = int(parts[1])
                year = parts[2]
                
            return f"{day:02d}/{month}/{year}"
    except Exception:
        pass
    return None

def fetch_exact_release_date(app_id):
    """Hits the official Steam API using the App ID to get the exact release date."""
    url = f"https://store.steampowered.com/api/appdetails?appids={app_id}"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Verify the API returned a successful match for this ID
        if data and str(app_id) in data and data[str(app_id)]['success']:
            game_data = data[str(app_id)]['data']
            raw_date = game_data.get('release_date', {}).get('date', '')
            
            if raw_date:
                return parse_steam_date(raw_date)
    except Exception as e:
        print(f"Error fetching AppID {app_id}: {e}")
    
    return None

def backfill_base_library_dates():
    if not os.path.exists(GAMES_JS_PATH):
        print(f"File not found: {GAMES_JS_PATH}")
        return

    with open(GAMES_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Isolate just the baseLibrary block to prevent messing with batches/coming soon
    match = re.search(r'(const baseLibrary = \[\n)(.*?)(\n\]; // End of baseLibrary)', content, re.DOTALL)
    if not match:
        print("Could not find baseLibrary array in games.js")
        return

    prefix = match.group(1)
    library_content = match.group(2)
    suffix = match.group(3)

    lines = library_content.split('\n')
    updated_lines = []
    update_count = 0

    print("Starting Mass Fetch... This will take some time due to the 1.5s sleep.")
    print("-" * 50)

    for line in lines:
        # Only process lines that have an ID but don't have a release_date yet
        if 'id: "' in line and 'release_date:' not in line:
            id_match = re.search(r'id:\s*"(\d+)"', line)
            name_match = re.search(r'name:\s*"(.*?)"', line)
            
            if id_match and name_match:
                app_id = id_match.group(1)
                game_name = name_match.group(1)
                
                print(f"Fetching: {game_name} ({app_id})...")
                release_date = fetch_exact_release_date(app_id)
                
                if release_date:
                    print(f" -> Found: {release_date}")
                    # Remove the trailing space and brace ' },'
                    line = re.sub(r'\s*},\s*$', '', line)
                    # Inject the new release date and close the object
                    line += f', release_date: "{release_date}" }},'
                    update_count += 1
                else:
                    print(" -> No standard date found or API failed.")
                
                # STRICT 1.5 SECOND SLEEP TO PREVENT STEAM API BANS
                time.sleep(1.5)
        
        updated_lines.append(line)

    if update_count > 0:
        new_library_content = '\n'.join(updated_lines)
        new_content = content.replace(library_content, new_library_content)

        with open(GAMES_JS_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("-" * 50)
        print(f"SUCCESS! {update_count} games were updated with exact release dates in games.js.")
    else:
        print("No new games needed updating.")

if __name__ == "__main__":
    backfill_base_library_dates()
