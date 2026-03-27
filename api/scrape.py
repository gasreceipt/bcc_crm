import googlemaps
import csv
import time

# --- CONFIGURATION ---
API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'
gmaps = googlemaps.Client(key=API_KEY)

# Industry-specific settings: (Keyword, Radius in meters, Category)
# Adjusting radius: 1600 meters ~ 1 mile
TARGET_INDUSTRIES = [
    {"term": "Landscaping", "radius": 15000, "type": "service"}, # ~9 miles
    {"term": "Real Estate Agency", "radius": 8000, "type": "professional"}, # ~5 miles
    {"term": "Tree Service", "radius": 20000, "type": "service"}, # ~12 miles
    {"term": "Roofing Contractor", "radius": 20000, "type": "service"}
]

# Words that often signal a "Cold Corporate" lead
CORP_KEYWORDS = ["inc", "corp", "corporation", "management", "group", "holdings", "solutions"]

def is_owner_operated(place_details):
    """
    Filters for signals that a human is 'home'.
    Checks if they have a website and if they have actual reviews.
    """
    name = place_details.get('name', '').lower()
   
    # 1. Basic Corporate Filter
    if any(word in name for word in CORP_KEYWORDS):
        return False
   
    # 2. Activity Check: Does the owner care about their digital storefront?
    # We want businesses with a website and at least some social proof.
    has_website = bool(place_details.get('website'))
    review_count = place_details.get('user_ratings_total', 0)
   
    if has_website and review_count > 5:
        return True
   
    return False

def scrape_warm_leads(location_name):
    all_leads = []
   
    # Get coordinates for the town center
    geocode_result = gmaps.geocode(location_name)
    if not geocode_result:
        return
    lat_lng = geocode_result[0]['geometry']['location']

    for industry in TARGET_INDUSTRIES:
        print(f"Searching for {industry['term']} in {location_name}...")
       
        places_result = gmaps.places_nearby(
            location=lat_lng,
            radius=industry['radius'],
            keyword=industry['term']
        )

        for place in places_result.get('results', []):
            # Fetch deeper details for the 'Owner-Operated' check
            details = gmaps.place(place_id=place['place_id'],
                                 fields=['name', 'formatted_phone_number', 'website', 'user_ratings_total', 'rating', 'formatted_address']).get('result', {})
           
            if is_owner_operated(details):
                lead = {
                    "Name": details.get('name'),
                    "Phone": details.get('formatted_phone_number'),
                    "Website": details.get('website'),
                    "Rating": details.get('rating'),
                    "Reviews": details.get('user_ratings_total'),
                    "Address": details.get('formatted_address'),
                    "Industry": industry['term']
                }
                all_leads.append(lead)
       
        time.sleep(2) # Respect API limits

    return all_leads

# --- EXECUTION ---
town = "Wareham, MA"
warm_leads = scrape_warm_leads(town)

# Save to CSV
with open(f'warm_leads_{town.replace(", ", "_")}.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=["Name", "Phone", "Website", "Rating", "Reviews", "Address", "Industry"])
    writer.writeheader()
    writer.writerows(warm_leads)

print(f"Successfully saved {len(warm_leads)} warm leads!")