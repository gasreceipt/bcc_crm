const STORAGE_KEY = 'benchcraft-crm-demo-v1';

const INDUSTRIES = [
  'Landscaping',
  'Real Estate',
  'Tree Service',
  'Roofing',
  'HVAC',
  'Plumber',
  'Lawyer',
  'Dentist',
  'Insurance Agency',
  'Auto Repair',
  'Financial Advisor',
  'Home Remodeling',
  'Pool & Patio',
  'Luxury Interior',
  'Solar & Smart Home',
  'Pet Services',
  'Exterior Cleaning',
  'Fencing & Decking',
  'Women-Owned',
];

const PRODUCTS = ['Scorecards', 'Benches', 'Tee Signs', 'Ball Washers', 'Course Guides', 'Display Boards', 'Yardage Cards'];
const STATUSES = ['Tee Box', 'Fairway', 'Green', 'Flagstick', 'Clubhouse', 'Bunker', 'Do Not Call', 'Hazard'];

const INDUSTRY_POOLS = {
  Landscaping: ['Seaside Turf Co.', 'Bayline Lawn Studio', 'Evergreen Estate Care', 'Mainsail Outdoor Group', 'Harbor Cut Landscaping'],
  'Real Estate': ['Anchor Point Realty', 'Salt Marsh Properties', 'North Harbor Homes', 'Commonwealth Coastal Realty', 'Open House Advisors'],
  'Tree Service': ['Canopy Brothers Tree Care', 'Cedar Line Arborists', 'Hightop Tree & Crane', 'Branch & Bark Services', 'Crown Lift Tree Co.'],
  Roofing: ['Compass Roofing & Exteriors', 'Harborline Roof Works', 'Peak Shield Roofing', 'Slate & Shingle Co.', 'Ironcrest Roofing'],
  HVAC: ['Blue Harbor Heating', 'Air Current Comfort', 'Climate Caddie HVAC', 'Northwind Mechanical', 'Summit Air & Heat'],
  Plumber: ['Pipewise Plumbing', 'Anchor Drain & Flow', 'Mainline Plumbing Co.', 'Right Angle Waterworks', 'Harbor Rooter'],
  Lawyer: ['Merrick Legal Group', 'Lighthouse Injury Law', 'Coastal Estate Counsel', 'Harrison Trial Partners', 'East Bay Business Law'],
  Dentist: ['Harbor Smile Studio', 'Bayview Dental Arts', 'Crown Point Family Dental', 'Seabright Cosmetic Dentistry', 'Beacon Dental Care'],
  'Insurance Agency': ['Harbor Shield Insurance', 'Compass Risk Advisors', 'Bayline Coverage Group', 'North End Insurance Co.', 'Anchor Family Insurance'],
  'Auto Repair': ['Redline Auto House', 'Harbor Motor Clinic', 'Coastline Brake & Tire', 'Main Street Transmission', 'Pit Lane Service Center'],
  'Financial Advisor': ['North Harbor Wealth', 'Waypoint Advisory Partners', 'Coastal Capital Planning', 'Signal Point Wealth', 'Mariner Financial Group'],
  'Home Remodeling': ['Cedar & Stone Remodelers', 'Harbor Home Works', 'Northlight Renovation Co.', 'Blueprint Build & Design', 'Craftline Remodeling'],
  'Pool & Patio': ['Backyard Tide Pools', 'Suncrest Patio & Pool', 'Harbor Leisure Outdoor', 'Bluewater Pool Studio', 'Patio Peak Living'],
  'Luxury Interior': ['Marble House Interiors', 'Golden Hour Design Studio', 'Northlight Home Styling', 'Seabrook Interior Atelier', 'Coastal Luxe Furnishings'],
  'Solar & Smart Home': ['Bright Grid Solar', 'Smart Harbor Systems', 'Sundial Energy Co.', 'North Coast Smart Home', 'Helio Home Control'],
  'Pet Services': ['Paws on Main Grooming', 'Tailwind Pet Spa', 'Harbor Hound Boarding', 'Whisker & Wash Co.', 'North Shore Vet Lounge'],
  'Exterior Cleaning': ['Harbor Wash Pros', 'Crystal Coast Window Care', 'Freshline Pressure Wash', 'Gutter Glow Services', 'Tidal Clean Exteriors'],
  'Fencing & Decking': ['Timberline Deck Works', 'Boundary Brothers Fence Co.', 'Harbor Rail & Deck', 'Cedar Coast Outdoor Build', 'Fencecraft Builders'],
  'Women-Owned': ['Oak & Bloom Med Spa', 'The Glow Loft', 'Harbor Pilates House', 'Northlight Wellness Studio', 'Roseline Event Atelier'],
  All: ['Harborline Creative', 'Beacon Service Group', 'North Coast Local Co.', 'Community Growth Partners', 'Main Street Advantage'],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRating() {
  return Number((Math.random() * 0.8 + 4.1).toFixed(1));
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizePhone(index) {
  return `(508) 55${index}-${randomInt(1000, 9999)}`;
}

function makeWebsite(name) {
  return `https://www.${slugify(name).replace(/_/g, '')}.com`;
}

function makeLead(name, industry, location, overrides = {}) {
  const ownerOperated = overrides.ownerOperated ?? Math.random() > 0.3;
  const distanceBase = overrides.distance ?? `~${randomInt(3, 22)}mi zone`;
  return {
    id: uid('lead'),
    name,
    phone: overrides.phone ?? normalizePhone(randomInt(10, 99)),
    website: overrides.website ?? makeWebsite(name),
    rating: overrides.rating ?? randomRating(),
    reviews: overrides.reviews ?? randomInt(8, 230),
    address: overrides.address ?? `${randomInt(12, 950)} ${pick(['Main St', 'Harbor Rd', 'Bay Ave', 'Market St', 'Oak Lane'])}, ${location}`,
    industry,
    distance: distanceBase,
    ownerOperated,
    score: overrides.score ?? (ownerOperated ? randomInt(88, 98) : randomInt(55, 82)),
    status: overrides.status ?? 'Tee Box',
    notes: overrides.notes ?? '',
  };
}

function createInitialState() {
  const courses = [
    { id: 'default', name: 'General Leads', defaultLocation: 'Wareham, MA' },
    { id: 'comfort_showers_baths', name: 'Comfort Showers & Baths', defaultLocation: 'Plymouth, MA' },
    { id: 'pine_barrens_cc', name: 'Pine Barrens Country Club', defaultLocation: 'Cape Cod, MA' },
  ];

  const leadsByCourse = {
    default: [
      makeLead('Harbor Wash Pros', 'Exterior Cleaning', 'Wareham, MA', { status: 'Fairway', notes: 'Answered first call. Wants spring package pricing.' }),
      makeLead('North Harbor Wealth', 'Financial Advisor', 'Wareham, MA', { status: 'Green', notes: 'Assistant requested one-page overview.' }),
      makeLead('Blue Harbor Heating', 'HVAC', 'Wareham, MA', { status: 'Tee Box' }),
      makeLead('Oak & Bloom Med Spa', 'Women-Owned', 'Wareham, MA', { status: 'Flagstick', ownerOperated: true }),
      makeLead('Boundary Brothers Fence Co.', 'Fencing & Decking', 'Wareham, MA', { status: 'Bunker', ownerOperated: true }),
      makeLead('Anchor Point Realty', 'Real Estate', 'Wareham, MA', { status: 'Hazard', ownerOperated: false }),
    ],
    comfort_showers_baths: [
      makeLead('Craftline Remodeling', 'Home Remodeling', 'Plymouth, MA', { status: 'Fairway', ownerOperated: true }),
      makeLead('Compass Roofing & Exteriors', 'Roofing', 'Plymouth, MA', { status: 'Tee Box' }),
      makeLead('Pipewise Plumbing', 'Plumber', 'Plymouth, MA', { status: 'Green', notes: 'Asked about neighborhood exclusivity.' }),
      makeLead('Harbor Smile Studio', 'Dentist', 'Plymouth, MA', { status: 'Do Not Call', ownerOperated: false }),
      makeLead('Marble House Interiors', 'Luxury Interior', 'Plymouth, MA', { status: 'Flagstick' }),
    ],
    pine_barrens_cc: [
      makeLead('Suncrest Patio & Pool', 'Pool & Patio', 'Cape Cod, MA', { status: 'Fairway' }),
      makeLead('Bright Grid Solar', 'Solar & Smart Home', 'Cape Cod, MA', { status: 'Tee Box' }),
      makeLead('Tailwind Pet Spa', 'Pet Services', 'Cape Cod, MA', { status: 'Bunker', ownerOperated: true }),
      makeLead('Merrick Legal Group', 'Lawyer', 'Cape Cod, MA', { status: 'Hazard', ownerOperated: false }),
    ],
  };

  const sales = [
    {
      id: uid('sale'),
      clientName: 'Seaside Turf Co.',
      courseName: 'General Leads',
      product: 'Tee Signs',
      price: 4200,
      date: '3/10/2026',
      leadId: null,
    },
    {
      id: uid('sale'),
      clientName: 'Craftline Remodeling',
      courseName: 'Comfort Showers & Baths',
      product: 'Benches',
      price: 6800,
      date: '3/16/2026',
      leadId: null,
    },
    {
      id: uid('sale'),
      clientName: 'Suncrest Patio & Pool',
      courseName: 'Pine Barrens Country Club',
      product: 'Scorecards',
      price: 3100,
      date: '3/20/2026',
      leadId: null,
    },
  ];

  return { courses, leadsByCourse, sales };
}

function loadState() {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initialState = createInitialState();
    saveState(initialState);
    return initialState;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const initialState = createInitialState();
    saveState(initialState);
    return initialState;
  }
}

function saveState(state) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function mutateState(updater) {
  const state = loadState();
  const nextState = updater(state) || state;
  saveState(nextState);
  return nextState;
}

function getIndustryPool(industry) {
  if (industry && industry !== 'All') {
    return { industry, names: INDUSTRY_POOLS[industry] || INDUSTRY_POOLS.All };
  }
  const selectedIndustry = pick(INDUSTRIES);
  return { industry: selectedIndustry, names: INDUSTRY_POOLS[selectedIndustry] || INDUSTRY_POOLS.All };
}

export async function listCourses() {
  await delay();
  return clone(loadState().courses);
}

export async function listLeads(courseId = 'default') {
  await delay();
  const state = loadState();
  return clone(state.leadsByCourse[courseId] || []);
}

export async function listSales() {
  await delay();
  return clone(loadState().sales);
}

export async function upsertCourse(course) {
  await delay();
  const nextState = mutateState((state) => {
    const index = state.courses.findIndex((entry) => entry.id === course.id);
    if (index >= 0) {
      state.courses[index] = { ...state.courses[index], ...course };
    } else {
      state.courses.push(course);
    }
    if (!state.leadsByCourse[course.id]) {
      state.leadsByCourse[course.id] = [];
    }
    return state;
  });

  return clone(nextState.courses.find((entry) => entry.id === course.id));
}

export async function deleteCourse(courseId) {
  await delay();
  mutateState((state) => {
    state.courses = state.courses.filter((course) => course.id !== courseId);
    delete state.leadsByCourse[courseId];
    return state;
  });
}

export async function updateLead(courseId, leadId, patch) {
  await delay();
  const nextState = mutateState((state) => {
    const leads = state.leadsByCourse[courseId] || [];
    const index = leads.findIndex((lead) => lead.id === leadId);
    if (index >= 0) {
      leads[index] = { ...leads[index], ...patch };
    }
    return state;
  });

  return clone((nextState.leadsByCourse[courseId] || []).find((lead) => lead.id === leadId));
}

export async function bulkUpdateLeads(courseId, ids, status) {
  await delay();
  mutateState((state) => {
    state.leadsByCourse[courseId] = (state.leadsByCourse[courseId] || []).map((lead) => (
      ids.includes(lead.id) ? { ...lead, status } : lead
    ));
    return state;
  });
}

export async function bulkDeleteLeads(courseId, ids) {
  await delay();
  mutateState((state) => {
    state.leadsByCourse[courseId] = (state.leadsByCourse[courseId] || []).filter((lead) => !ids.includes(lead.id));
    return state;
  });
}

export async function deleteLead(courseId, leadId) {
  await delay();
  mutateState((state) => {
    state.leadsByCourse[courseId] = (state.leadsByCourse[courseId] || []).filter((lead) => lead.id !== leadId);
    return state;
  });
}

export async function createSale(payload) {
  await delay();
  const sale = {
    id: uid('sale'),
    ...payload,
    product: payload.product || pick(PRODUCTS),
    price: Number(payload.price || 0),
  };

  mutateState((state) => {
    state.sales.push(sale);
    return state;
  });

  return clone(sale);
}

export async function deleteSale(saleId) {
  await delay();
  mutateState((state) => {
    state.sales = state.sales.filter((sale) => sale.id !== saleId);
    return state;
  });
}

export async function convertLeadToSale(courseId, leadId, payload) {
  await delay();
  const sale = {
    id: uid('sale'),
    ...payload,
    price: Number(payload.price || 0),
    leadId,
  };

  mutateState((state) => {
    state.leadsByCourse[courseId] = (state.leadsByCourse[courseId] || []).filter((lead) => lead.id !== leadId);
    state.sales.push(sale);
    return state;
  });

  return clone(sale);
}

export async function scanForLeads({ location, radius, industry, ownerOperatedOnly, courseId }) {
  await delay(1200);

  const state = loadState();
  const existingLeads = state.leadsByCourse[courseId] || [];
  const existingNames = new Set(existingLeads.map((lead) => lead.name));
  const createdLeads = [];
  const desiredCount = randomInt(4, Math.min(9, Math.max(5, Math.round(radius / 4) + 3)));

  while (createdLeads.length < desiredCount) {
    const pool = getIndustryPool(industry);
    const leadName = pick(pool.names);
    const ownerOperated = ownerOperatedOnly ? true : Math.random() > 0.35;

    if (existingNames.has(leadName) || createdLeads.some((lead) => lead.name === leadName)) {
      continue;
    }

    createdLeads.push(
      makeLead(leadName, pool.industry, location, {
        ownerOperated,
        distance: `~${Math.max(1, randomInt(1, radius))}mi zone`,
      })
    );
  }

  mutateState((nextState) => {
    nextState.leadsByCourse[courseId] = [...(nextState.leadsByCourse[courseId] || []), ...createdLeads];
    return nextState;
  });

  return clone(createdLeads);
}
