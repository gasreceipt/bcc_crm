import os
import uuid
import time
import json
import math
from typing import List, Optional
import pandas as pd
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import googlemaps

# Load environment variables
API_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(API_DIR, ".env"))

app = FastAPI(title="Bunker the Ball Deep-Scout API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = os.path.join(API_DIR, "courses_config.json")
SALES_FILE = os.path.join(API_DIR, "sales.csv")

# Industry Synonym Map (Implementation #3)
INDUSTRY_SYNS = {
    "Landscaping": ["Landscaping", "Lawn Care", "Hardscaping", "Lawn Mowing Service"],
    "Real Estate": ["Real Estate Agency", "Real Estate Broker", "Property Management"],
    "Tree Service": ["Tree Service", "Arborist", "Tree Removal"],
    "Roofing": ["Roofing Contractor", "Roof Cleaning", "Gutter Cleaning"],
    "HVAC": ["HVAC Contractor", "Air Conditioning Repair", "Heating Contractor"],
    "Plumber": ["Plumber", "Drain Cleaning", "Water Heater Repair"],
    "Lawyer": ["Lawyer", "Attorney", "Law Firm", "Legal Services"],
    "Dentist": ["Dentist", "Dental Clinic", "Cosmetic Dentist"],
    "Insurance Agency": ["Insurance Agency", "Insurance Broker", "Auto Insurance"],
    "Auto Repair": ["Auto Repair Shop", "Mechanic", "Brake Shop", "Transmission Shop"],
    "Financial Advisor": ["Financial Advisor", "Financial Planner", "Wealth Management"],
    "Home Remodeling": ["General Contractor", "Home Remodeler", "Kitchen Remodeler", "Bathroom Remodeler"],
    "Pool & Patio": ["Pool Construction", "Pool Maintenance", "Pool Repair", "Patio Builder", "Outdoor Kitchens"],
    "Luxury Interior": ["Interior Designer", "Interior Decorator", "Custom Furniture", "Lighting Designer"],
    "Solar & Smart Home": ["Solar Installation", "Home Automation", "Home Theater Installation", "Security Systems"],
    "Pet Services": ["Dog Groomer", "Pet Boarding", "Veterinarian", "Cat Grooming"],
    "Exterior Cleaning": ["Power Washing", "Window Cleaning", "Pressure Washing", "Gutter Cleaning"],
    "Fencing & Decking": ["Fence Contractor", "Deck Builder", "Railing Contractor"],
    "Women-Owned": ["Med Spa", "Medical Aesthetics", "Pilates Studio", "Yoga Studio", "Event Planner", "Luxury Florist", "Boutique", "Jewelry Designer", "Travel Consultant", "Wellness Center", "Early Childhood Education"],
    "All": ["Landscaping", "Real Estate", "Pool & Patio", "Luxury Interior", "Solar & Smart Home", "Pet Services", "Exterior Cleaning", "Fencing & Decking", "Women-Owned", "Roofing", "HVAC", "Plumber", "Lawyer"]
}

# --- Models ---
class CourseConfig(BaseModel):
    id: str
    name: str
    defaultLocation: str

class LeadBase(BaseModel):
    name: str
    phone: Optional[str] = ""
    website: Optional[str] = ""
    rating: Optional[float] = 0.0
    reviews: Optional[int] = 0
    address: Optional[str] = ""
    industry: str
    distance: str
    ownerOperated: bool
    score: int
    status: str = "Tee Box"
    notes: str = ""

class Lead(LeadBase):
    id: str

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class SaleBase(BaseModel):
    clientName: str
    courseName: str
    product: str
    price: float
    date: str
    leadId: Optional[str] = None

class Sale(SaleBase):
    id: str

class ScanRequest(BaseModel):
    location: str
    radius: int 
    industry: str
    ownerOperatedOnly: bool
    courseId: str

# --- Business Logic ---

CORP_KEYWORDS = ["inc", "corp", "corporation", "management", "group", "holdings", "solutions", "partners"]
# Patterns that strongly suggest an owner-operator (Implementation #4)
OWNER_PATTERNS = ["'s", "s'", "& sons", "family", "associates", "brothers", "son", "jt", "jr", "sr"]

def is_owner_operated(place_details):
    name = place_details.get('name', '').lower()
    
    # 1. Corporate filter (Aggressive)
    if any(word in name for word in CORP_KEYWORDS):
        return False
        
    # 2. Owner-Operator Clues (Implementation #4 - Positive Weight)
    has_owner_pattern = any(pattern in name for pattern in OWNER_PATTERNS)
    
    # 3. Size Check
    has_website = bool(place_details.get('website'))
    review_count = place_details.get('user_ratings_total', 0)
    rating = place_details.get('rating', 0)
    
    # If it has an owner name pattern, we relax the review requirement
    if has_owner_pattern:
        return True if review_count >= 1 else False # At least some life
        
    # Standard check: must be active but not massive
    if has_website and 3 <= review_count <= 250:
        return True
        
    return False

# --- Grid Math (Implementation #1) ---
def get_grid_points(center_lat, center_lng, radius_miles):
    """Returns a list of 9 (lat, lng) points covering the radius area."""
    if radius_miles <= 5:
        return [(center_lat, center_lng)]
        
    points = [(center_lat, center_lng)]  # Always include the center
    
    # Grid offset factor (approx miles to degrees)
    # 1 degree lat ≈ 69 miles
    # 1 degree lng ≈ 69 * cos(lat) miles
    lat_offset = (radius_miles * 0.6) / 69.0
    lng_offset = (radius_miles * 0.6) / (69.0 * math.cos(math.radians(center_lat)))
    
    # 8 points around the center
    offsets = [
        (lat_offset, 0), (-lat_offset, 0), (0, lng_offset), (0, -lng_offset),
        (lat_offset, lng_offset), (lat_offset, -lng_offset), (-lat_offset, lng_offset), (-lat_offset, -lng_offset)
    ]
    
    for d_lat, d_lng in offsets:
        points.append((center_lat + d_lat, center_lng + d_lng))
        
    return points

# --- Helpers ---
def get_config():
    if not os.path.exists(CONFIG_FILE):
        default = [{"id": "default", "name": "General Leads", "defaultLocation": "Wareham, MA"}]
        with open(CONFIG_FILE, 'w') as f:
            json.dump(default, f)
        return default
    with open(CONFIG_FILE, 'r') as f: return json.load(f)

def save_config(config):
    with open(CONFIG_FILE, 'w') as f: json.dump(config, f)

def get_csv_path(course_id: str):
    return f"leads_{course_id}.csv" if course_id != "default" else "leads.csv"

def load_leads(course_id: str) -> pd.DataFrame:
    path = get_csv_path(course_id)
    if not os.path.exists(path):
        df = pd.DataFrame(columns=["id", "name", "phone", "website", "rating", "reviews", "address", "industry", "distance", "ownerOperated", "score", "status", "notes"])
        df.to_csv(path, index=False)
        return df
    return pd.read_csv(path, dtype={'notes': str, 'phone': str, 'distance': str, 'id': str, 'status': str})

def save_leads(df: pd.DataFrame, course_id: str):
    df.to_csv(get_csv_path(course_id), index=False)

def load_sales() -> pd.DataFrame:
    if not os.path.exists(SALES_FILE):
        df = pd.DataFrame(columns=["id", "clientName", "courseName", "product", "price", "date", "leadId"])
        df.to_csv(SALES_FILE, index=False)
        return df
    return pd.read_csv(SALES_FILE, dtype={'id': str, 'leadId': str})

def save_sales(df: pd.DataFrame):
    df.to_csv(SALES_FILE, index=False)

# --- Endpoints ---

@app.get("/api/courses")
def list_courses():
    return get_config()

@app.post("/api/courses")
def create_course(course: CourseConfig):
    config = get_config()
    if any(c['id'] == course.id for c in config):
        raise HTTPException(status_code=400, detail="Course ID already exists")
    config.append(course.dict())
    save_config(config)
    load_leads(course.id)
    return course

@app.put("/api/courses/{course_id}")
def update_course(course_id: str, update: CourseConfig):
    config = get_config()
    for i, c in enumerate(config):
        if c['id'] == course_id:
            config[i] = update.dict(); save_config(config); return update
    raise HTTPException(status_code=404, detail="Course not found")

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: str):
    config = get_config(); new_config = [c for c in config if c['id'] != course_id]
    if len(new_config) == len(config): raise HTTPException(status_code=404, detail="Course not found")
    save_config(new_config)
    path = get_csv_path(course_id)
    if os.path.exists(path): os.remove(path)
    return {"status": "success"}

@app.get("/api/leads", response_model=List[Lead])
def get_leads(course: str = Query("default")):
    df = load_leads(course); df = df.fillna(""); return df.to_dict(orient="records")

@app.put("/api/leads/bulk/update")
def bulk_update_leads(update: dict, course: str = Query("default")):
    ids = update.get('ids', [])
    new_status = update.get('status')
    if not ids: return {"status": "success"}
    
    df = load_leads(course)
    # Update status for all matching IDs in one go
    df.loc[df['id'].isin(ids), 'status'] = new_status
    save_leads(df, course)
    return {"status": "success", "count": len(ids)}

@app.delete("/api/leads/bulk/delete")
def bulk_delete_leads(ids: List[str] = Query(...), course: str = Query("default")):
    df = load_leads(course)
    df = df[~df['id'].isin(ids)]
    save_leads(df, course)
    return {"status": "success"}

@app.put("/api/leads/{lead_id}", response_model=Lead)
def update_lead(lead_id: str, update: LeadUpdate, course: str = Query("default")):
    df = load_leads(course); idx = df.index[df['id'] == lead_id].tolist()
    if not idx: raise HTTPException(status_code=404, detail="Lead not found")
    idx = idx[0]
    if update.status is not None: df.at[idx, 'status'] = update.status
    if update.notes is not None: df.at[idx, 'notes'] = update.notes
    save_leads(df, course)
    updated = df.iloc[idx].fillna("").to_dict()
    updated['ownerOperated'] = True if str(updated.get('ownerOperated', '')).lower() == 'true' else False
    return updated

@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: str, course: str = Query("default")):
    df = load_leads(course)
    if not (df['id'] == lead_id).any(): raise HTTPException(status_code=404, detail="Lead not found")
    df = df[df['id'] != lead_id]; save_leads(df, course); return {"status": "success"}



@app.get("/api/sales", response_model=List[Sale])
def get_sales():
    df = load_sales(); df = df.fillna(""); return df.to_dict(orient="records")

@app.post("/api/sales", response_model=Sale)
def create_sale(sale: SaleBase):
    df = load_sales(); sale_id = str(uuid.uuid4())
    new_sale = Sale(id=sale_id, **sale.dict())
    df = pd.concat([df, pd.DataFrame([new_sale.dict()])], ignore_index=True)
    save_sales(df); return new_sale

@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: str):
    df = load_sales()
    if not (df['id'] == sale_id).any(): raise HTTPException(status_code=404, detail="Sale not found")
    df = df[df['id'] != sale_id]; save_sales(df); return {"status": "success"}

@app.post("/api/leads/{lead_id}/convert")
def convert_lead_to_sale(lead_id: str, sale_info: SaleBase, course: str = Query("default")):
    df_leads = load_leads(course)
    if (df_leads['id'] == lead_id).any():
        df_leads = df_leads[df_leads['id'] != lead_id]; save_leads(df_leads, course)
    return create_sale(sale_info)

# --- SCAN ENGINE (Deep Scout Implementation) ---

@app.post("/api/scan", response_model=List[Lead])
def run_scan(request: ScanRequest):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key: raise HTTPException(status_code=400, detail="API Key missing")
    gmaps = googlemaps.Client(key=api_key)
    
    # 1. Geocode center
    geocode_result = gmaps.geocode(request.location)
    if not geocode_result: raise HTTPException(status_code=404, detail="Location not found")
    center = geocode_result[0]['geometry']['location']
    
    # 2. Get Search Grid (Implementation #1)
    grid_points = get_grid_points(center['lat'], center['lng'], request.radius)
    # Target Radius for small circles (reduced to avoid too much overlap)
    mini_radius = (request.radius * 1609) / 2 # meters
    
    # 3. Expand Industries (Implementation #3)
    industries_to_search = INDUSTRY_SYNS.get(request.industry, [request.industry])
    
    found_place_ids = set()
    new_leads = []
    
    # Deep Loop: For each Industry synonym...
    for industry_keyword in industries_to_search:
        # Deep Loop: For each point in the grid...
        for lat, lng in grid_points:
            try:
                # 4. Result Paging (Implementation #2) - Up to 3 pages (60 rows) per Mini-Circle
                page_token = None
                pages_fetched = 0
                
                while pages_fetched < 3:
                    places_result = gmaps.places_nearby(
                        location=(lat, lng), 
                        radius=int(mini_radius), 
                        keyword=industry_keyword,
                        page_token=page_token
                    )
                    
                    for place in places_result.get('results', []):
                        pid = place['place_id']
                        if pid in found_place_ids: continue
                        found_place_ids.add(pid)
                        
                        # Fetch full details
                        details = gmaps.place(
                            place_id=pid, 
                            fields=['name', 'formatted_phone_number', 'website', 'user_ratings_total', 'rating', 'formatted_address']
                        ).get('result', {})
                        
                        is_owner_op = is_owner_operated(details)
                        if request.ownerOperatedOnly and not is_owner_op: continue
                        
                        new_leads.append(Lead(
                            id=str(uuid.uuid4()),
                            name=details.get('name', 'Unknown'),
                            phone=details.get('formatted_phone_number', ''),
                            website=details.get('website', ''),
                            rating=details.get('rating', 0.0),
                            reviews=details.get('user_ratings_total', 0),
                            address=details.get('formatted_address', request.location),
                            industry=request.industry, # Keep the category consistent
                            distance=f"~{request.radius}mi zone",
                            ownerOperated=is_owner_op,
                            score=95 if is_owner_op else 50,
                            status="Tee Box",
                            notes=""
                        ))
                    
                    page_token = places_result.get('next_page_token')
                    if not page_token: break
                    pages_fetched += 1
                    time.sleep(2) # MANDATORY pause for next_page_token to become valid
                    
            except Exception as e:
                print(f"Scout error at {lat},{lng}: {e}")
                pass
            
            time.sleep(0.5) # Basic pacing
            
    # 5. Deduplicate and Save
    if new_leads:
        df = load_leads(request.courseId)
        # Check against names in the specific course CSV
        existing_names = set(df['name'].tolist()) if 'name' in df.columns else set()
        unique_new = [l for l in new_leads if l.name not in existing_names]
        
        if unique_new:
            new_df = pd.DataFrame([l.dict() for l in unique_new])
            df = pd.concat([df, new_df], ignore_index=True)
            save_leads(df, request.courseId)
        return [l.dict() for l in unique_new]
        
    return []
