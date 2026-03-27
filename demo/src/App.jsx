import { useState, useEffect } from 'react';
import { 
  Search, MapPin, Target,
  Map, Star, Phone, Globe, Activity, ShieldCheck,
  BookOpen, Trash2, LayoutDashboard, DollarSign,
  Trophy, PlusCircle, X, ExternalLink, GraduationCap,
  Edit2, HelpCircle, CheckSquare, Square, MoveHorizontal,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import './App.css';
import {
  bulkDeleteLeads,
  bulkUpdateLeads,
  convertLeadToSale,
  deleteCourse as deleteStoredCourse,
  deleteLead as deleteStoredLead,
  deleteSale as deleteStoredSale,
  listCourses,
  listLeads,
  listSales,
  scanForLeads,
  upsertCourse,
  updateLead as updateStoredLead,
  createSale,
} from './mockData';

const COLUMNS = ["Tee Box", "Fairway", "Green", "Flagstick", "Clubhouse", "Bunker", "Do Not Call", "Hazard"];
const PRODUCTS = ["Scorecards", "Benches", "Tee Signs", "Ball Washers", "Course Guides", "Display Boards", "Yardage Cards"];
const HELPER_TIPS = {
  pipeline: [
    {
      title: 'Scout smarter',
      body: 'Start with a tight radius and owner-ready mode on, then widen the search once the best local prospects are covered.'
    },
    {
      title: 'Move in batches',
      body: 'Tap lead cards to select multiple prospects, then use the bulk move bar to clean up your board fast.'
    },
    {
      title: 'Save the context',
      body: 'Use notes after each call so the next follow-up starts with the right angle instead of guesswork.'
    }
  ],
  overview: [
    {
      title: 'Read the funnel first',
      body: 'A crowded Tee Box usually means you have room to qualify harder before adding more new names.'
    },
    {
      title: 'Watch stage balance',
      body: 'If leads pile up in Fairway or Bunker, the next move is usually follow-up quality, not more scanning.'
    },
    {
      title: 'Use the snapshot',
      body: 'Conversion rate and average sale together tell you whether the pipeline is both healthy and valuable.'
    }
  ],
  sales: [
    {
      title: 'Log wins quickly',
      body: 'Record closed deals right away so revenue totals and conversion numbers stay honest.'
    },
    {
      title: 'Track product mix',
      body: 'Your product column helps reveal which golf assets are closing most often across tours.'
    },
    {
      title: 'Recent sales matter',
      body: 'Use the latest wins as proof points when you are pitching similar prospects still in motion.'
    }
  ]
};

const COLUMN_KEY = [
  { name: "Tee Box", desc: "First Tee / Unprocessed leads.", color: "#4CAF50" },
  { name: "Fairway", desc: "In Play / Active conversation.", color: "#81C784" },
  { name: "Green", desc: "On the Approach / Pitching deal.", color: "#45a049" },
  { name: "Flagstick", desc: "Going for Sink / Closing status.", color: "#FFD700" },
  { name: "Clubhouse", desc: "Hole in One / Deal closed!", color: "#fff" },
  { name: "Bunker", desc: "Trapped / Bad start, but fixable.", color: "#d2b48c" },
  { name: "Do Not Call", desc: "DNC / Never contact again.", color: "#ff9800" },
  { name: "Hazard", desc: "Out of Bounds / Not interested.", color: "#ef4444" }
];

function App() {
  const [activeTab, setActiveTab] = useState('pipeline');
  
  // Courses State
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseLocation, setNewCourseLocation] = useState('');

  // Pipeline State
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(15);
  const [industry, setIndustry] = useState('All');
  const [ownerOperatedOnly, setOwnerOperatedOnly] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [notesDraft, setNotesDraft] = useState({});
  const [editingNotes, setEditingNotes] = useState(null);

  // Sales State
  const [sales, setSales] = useState([]);
  const [isSaleFormOpen, setIsSaleFormOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState(null);
  const [saleFormData, setSaleFormData] = useState({
    clientName: '',
    courseName: '',
    product: PRODUCTS[0],
    price: ''
  });
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const [helperTipIndex, setHelperTipIndex] = useState(0);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const cData = await listCourses();
        setCourses(cData);
        if (cData.length > 0) {
          const firstCourse = cData[0];
          setActiveCourse(firstCourse);
          setLocation(firstCourse.defaultLocation);
          setSelectedLeads(new Set());
          setLeads(await listLeads(firstCourse.id));
        }
        setSales(await listSales());
      } catch (err) { console.error("Initial fetch failed:", err); }
    };

    fetchInitialData();
  }, []);

  const helperTips = HELPER_TIPS[activeTab] || HELPER_TIPS.pipeline;
  const activeHelperTip = helperTips[helperTipIndex] || helperTips[0];

  useEffect(() => {
    setHelperTipIndex((currentIndex) => Math.min(currentIndex, helperTips.length - 1));
  }, [helperTips]);

  const handleCourseSwitch = async (course, shouldFetch = true) => {
    setActiveCourse(course);
    setLocation(course.defaultLocation);
    setSelectedLeads(new Set()); // Clear selection on switch
    if (shouldFetch) {
      await fetchLeads(course.id);
    } else {
      try {
        setLeads(await listLeads(course.id));
      } catch (err) { console.error(err); }
    }
  };

  const fetchLeads = async (courseId) => {
    try {
      setLeads(await listLeads(courseId || activeCourse?.id));
    } catch (err) { console.error("Failed to fetch leads:", err); }
  };

  const fetchSales = async () => {
    try {
      setSales(await listSales());
    } catch (err) { console.error("Failed to fetch sales:", err); }
  };

  const openCourseModal = (course = null) => {
    if (course) {
      setIsEditingCourse(true);
      setNewCourseName(course.name);
      setNewCourseLocation(course.defaultLocation);
    } else {
      setIsEditingCourse(false);
      setNewCourseName('');
      setNewCourseLocation('');
    }
    setIsCourseModalOpen(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    if (isEditingCourse) {
      const updatedCourse = { ...activeCourse, name: newCourseName, defaultLocation: newCourseLocation };
      try {
        const savedCourse = await upsertCourse(updatedCourse);
        setCourses(prev => prev.map(c => c.id === activeCourse.id ? savedCourse : c));
        setActiveCourse(savedCourse);
        setLocation(savedCourse.defaultLocation);
        setIsCourseModalOpen(false);
      } catch { alert("Update failed."); }
    } else {
      const id = newCourseName.toLowerCase().replace(/\s+/g, '_');
      const newCourse = { id, name: newCourseName, defaultLocation: newCourseLocation };
      try {
        const savedCourse = await upsertCourse(newCourse);
        setCourses(prev => [...prev, savedCourse]);
        setIsCourseModalOpen(false);
        handleCourseSwitch(savedCourse);
      } catch { alert("Failed to create course."); }
    }
  };

  const handleDeleteCourse = async () => {
    if (!activeCourse || activeCourse.id === 'default') {
      alert("Cannot delete the general database.");
      return;
    }
    if (!window.confirm(`Permanently delete '${activeCourse.name}'? All leads in this pipeline will be lost.`)) return;
    
    try {
      await deleteStoredCourse(activeCourse.id);
      const updatedCourses = courses.filter(c => c.id !== activeCourse.id);
      setCourses(updatedCourses);
      const first = updatedCourses.find(c => c.id === 'default') || updatedCourses[0] || null;
      if (first) {
        handleCourseSwitch(first);
      } else {
        setActiveCourse(null);
        setLeads([]);
      }
      setIsCourseModalOpen(false);
    } catch { alert("Delete failed."); }
  };

  const handleSearch = async () => {
    if (!activeCourse) return;
    setIsSearching(true);
    try {
      await scanForLeads({
        location,
        radius,
        industry,
        ownerOperatedOnly,
        courseId: activeCourse.id
      });
      await fetchLeads(activeCourse.id);
    } catch { alert("Demo scan failed."); }
    finally { setIsSearching(false); }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const updated = await updateStoredLead(activeCourse.id, leadId, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
    } catch (err) { console.error(err); }
  };

  const toggleLeadSelection = (leadId) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) newSelection.delete(leadId);
    else newSelection.add(leadId);
    setSelectedLeads(newSelection);
  };

  const handleBulkMove = async (newStatus) => {
    const ids = Array.from(selectedLeads);
    try {
      await bulkUpdateLeads(activeCourse.id, ids, newStatus);
      await fetchLeads(activeCourse.id);
      setSelectedLeads(new Set());
    } catch { alert("Bulk move failed."); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedLeads.size} leads?`)) return;
    const ids = Array.from(selectedLeads);
    try {
      await bulkDeleteLeads(activeCourse.id, ids);
      await fetchLeads(activeCourse.id);
      setSelectedLeads(new Set());
    } catch { alert("Bulk delete failed."); }
  };

  const saveNotes = async (leadId) => {
    try {
      const updated = await updateStoredLead(activeCourse.id, leadId, { notes: notesDraft[leadId] || "" });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      setEditingNotes(null);
    } catch (err) { console.error(err); }
  };

  const deleteLead = async (leadId) => {
    if(!window.confirm("Remove prospect?")) return;
    try {
      await deleteStoredLead(activeCourse.id, leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err) { console.error(err); }
  };

  const deleteSale = async (saleId) => {
    if(!window.confirm("Is this deal truly cancelled?")) return;
    try {
      await deleteStoredSale(saleId);
      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (err) { console.error(err); }
  };

  const handleNewSaleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...saleFormData,
      price: parseFloat(saleFormData.price),
      date: new Date().toLocaleDateString(),
      leadId: convertingLead ? convertingLead.id : null
    };

    try {
      if (convertingLead) {
        await convertLeadToSale(activeCourse.id, convertingLead.id, payload);
      } else {
        await createSale(payload);
      }
      await fetchSales();
      await fetchLeads(activeCourse.id);
      setIsSaleFormOpen(false);
      setConvertingLead(null);
      setSaleFormData({ clientName: '', courseName: activeCourse.name, product: PRODUCTS[0], price: '' });
      setActiveTab('sales');
    } catch { alert("Failed to save sale."); }
  };

  const openConversionForm = (lead) => {
    setConvertingLead(lead);
    setSaleFormData({
      clientName: lead.name,
      courseName: activeCourse.name,
      product: PRODUCTS[0],
      price: ''
    });
    setIsSaleFormOpen(true);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);
  const ownerReadyCount = leads.filter(lead => lead.ownerOperated).length;
  const activeDealsCount = leads.filter(lead => !["Clubhouse", "Hazard", "Do Not Call"].includes(lead.status)).length;
  const avgSaleValue = sales.length ? totalRevenue / sales.length : 0;
  const convertedCount = sales.filter(sale => sale.leadId).length;
  const conversionBase = leads.length + convertedCount;
  const conversionRate = conversionBase ? Math.round((convertedCount / conversionBase) * 100) : 0;
  const statusSummary = COLUMNS.map((column) => ({
    column,
    count: leads.filter((lead) => lead.status === column).length,
  }));
  const topIndustries = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.industry] = (acc[lead.industry] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const recentSales = [...sales].slice(-5).reverse();

  return (
    <div className="app-container">
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div className="brand-container">
          <img
            src="https://img.icons8.com/ios-filled/100/4CAF50/golf-ball.png"
            alt="BenchCraft"
            className="mascot-image"
          />
          <div className="brand-title">BenchCraft<br/>Lead CRM</div>
          <p className="demo-note">Frontend demo with mock scouting and browser-saved data.</p>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setActiveTab('pipeline')}>
            <LayoutDashboard size={20} /> Current Pipeline
          </div>
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Trophy size={20} /> Command Overview
          </div>
          <div className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            <DollarSign size={20} /> The Money Board
          </div>
        </nav>

        {activeTab === 'pipeline' && (
          <div className="filter-section">
            <div className="filter-group">
              <label><MapPin size={12}/> Current Sector</label>
              <input type="text" className="filter-input" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="filter-group">
              <label><Target size={12}/> Radius: {radius}mi</label>
              <input type="range" min="1" max="50" value={radius} onChange={e => setRadius(parseInt(e.target.value))} />
            </div>
            <div className={`toggle-container ${ownerOperatedOnly ? 'active' : ''}`} onClick={() => setOwnerOperatedOnly(!ownerOperatedOnly)}>
              <div className="toggle-text">
                <h4>Tournament Ready</h4>
                <p>Prioritize owners</p>
              </div>
              <div className={`toggle-switch ${ownerOperatedOnly ? 'active' : ''}`}><div className="toggle-knob"></div></div>
            </div>

            <div className="filter-group">
              <label><Activity size={12}/> Ad Vertical (Industry)</label>
              <select className="filter-input" value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="All">All High-Intent</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Tree Service">Tree Service</option>
                <option value="Roofing">Roofing Contractor</option>
                <option value="HVAC">HVAC & Cooling</option>
                <option value="Plumber">Plumbing</option>
                <option value="Lawyer">Lawyers / Legal</option>
                <option value="Dentist">Dentists</option>
                <option value="Insurance Agency">Insurance</option>
                <option value="Auto Repair">Auto Repair</option>
                <option value="Financial Advisor">Financial Advisors</option>
                <option value="Home Remodeling">General Contractors</option>
                <option value="Pool & Patio">Pool & Patio</option>
                <option value="Luxury Interior">Luxury Interior</option>
                <option value="Solar & Smart Home">Solar & Smart Home</option>
                <option value="Pet Services">Pet Services</option>
                <option value="Exterior Cleaning">Exterior Cleaning</option>
                <option value="Fencing & Decking">Fencing & Decking</option>
                <option value="Women-Owned" style={{color: 'var(--primary)', fontWeight: 'bold'}}>✨ Women-Owned (Med Spas, etc)</option>
              </select>
            </div>

            <button className="primary-button" onClick={handleSearch} disabled={isSearching || !activeCourse}>
              <Search size={18} /> {isSearching ? 'Generating Demo Prospects...' : 'Generate Demo Prospects'}
            </button>

            {/* Sidebar Column Key */}
            <div className="column-key-section">
              <div className="key-header"><HelpCircle size={14}/> <span>Lead Pipeline Guide</span></div>
              <div className="key-list">
                {COLUMN_KEY.map(k => (
                  <div key={k.name} className="key-item">
                     <span className="key-dot" style={{backgroundColor: k.color}}></span>
                     <div className="key-info">
                       <strong>{k.name}</strong>
                       <p>{k.desc}</p>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        {activeTab === 'pipeline' ? (
          <>
            <header className="header pipeline-header">
              <div className="pipeline-heading">
                <div>
                  <div className="eyebrow">Tour Dashboard</div>
                  <h2>Tour: <span>{activeCourse?.name || '...'}</span></h2>
                  <p>Track local prospects, qualify owner-operators, and move strong fits through the golf-inspired pipeline.</p>
                </div>
                
                <div className="course-switcher">
                   <GraduationCap size={16} />
                   <select 
                      className="course-select" 
                      value={activeCourse?.id || ''} 
                      onChange={(e) => {
                        const course = courses.find(c => c.id === e.target.value);
                        if (course) handleCourseSwitch(course);
                      }}
                   >
                     {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <div className="course-switcher-actions">
                     <button onClick={() => openCourseModal(activeCourse)} className="icon-action subtle" title="Edit Course Info">
                        <Edit2 size={16} />
                     </button>
                     <button onClick={() => openCourseModal()} className="icon-action" title="New Course Database">
                        <PlusCircle size={18} />
                     </button>
                   </div>
                </div>
              </div>
              
              <div className="pipeline-metrics">
                <div className="metric-card">
                  <span>Active Leads</span>
                  <strong>{leads.length}</strong>
                </div>
                <div className="metric-card">
                  <span>Owner Ready</span>
                  <strong>{ownerReadyCount}</strong>
                </div>
                <div className="metric-card">
                  <span>In Motion</span>
                  <strong>{activeDealsCount}</strong>
                </div>
              </div>
            </header>

            {/* Bulk Actions Bar (Implementation #2) */}
            {selectedLeads.size > 0 && (
              <div className="bulk-actions-bar">
                <div className="bulk-count">
                   <Target size={18} /> {selectedLeads.size} leads selected
                </div>
                <div className="bulk-tools">
                   <div className="bulk-move">
                     <MoveHorizontal size={16} />
                     <select onChange={(e) => handleBulkMove(e.target.value)} value="">
                        <option value="" disabled>Move Selected To...</option>
                        {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <button className="bulk-delete" onClick={handleBulkDelete}>
                     <Trash2 size={16} /> Delete Selected
                   </button>
                   <button className="bulk-cancel" onClick={() => setSelectedLeads(new Set())}>
                     Cancel
                   </button>
                </div>
              </div>
            )}

            <div className="kanban-board">
              {COLUMNS.map(col => {
                const colLeads = leads.filter(l => l.status === col);
                return (
                  <div key={col} className="kanban-column">
                    <div className="kanban-header">
                      <h3>{col.toUpperCase()}</h3>
                      <span className="kanban-badge">{colLeads.length}</span>
                    </div>
                    <div className="kanban-cards">
                      {colLeads.map(lead => {
                        const isSelected = selectedLeads.has(lead.id);
                        return (
                          <div key={lead.id} className={`lead-card ${isSelected ? 'selected' : ''}`} onClick={(e) => {
                            if (e.target.closest('button, select, a, textarea')) return;
                            toggleLeadSelection(lead.id);
                          }}>
                            <div className="selection-indicator">
                              {isSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
                            </div>
                            <button className="delete-btn" onClick={() => deleteLead(lead.id)}><Trash2 size={14} /></button>
                            <div className="card-title">
                              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {lead.name}
                                <a href={`https://www.google.com/search?q=${encodeURIComponent(lead.name + ' ' + lead.address)}`} target="_blank" rel="noreferrer" title="Search Business" style={{ color: 'var(--primary)', opacity: 0.6 }}>
                                  <ExternalLink size={14} />
                                </a>
                              </h4>
                              <div className="card-meta"><span>{lead.industry}</span> • <span>{lead.distance}</span></div>
                            </div>
                            <div className="card-body">
                              <div className="info-row"><Star size={12} fill="#FFB800" color="#FFB800"/> {lead.rating} ranking</div>
                              <div className="info-row">
                                <MapPin size={12}/> 
                                <span>{lead.address.substring(0, 30)}...</span>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noreferrer" title="View on Maps" style={{ color: 'var(--text-dim)', marginLeft: 'auto', opacity: 0.6 }}>
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                            {lead.ownerOperated && <div className="signal-badge">TOURNAMENT READY</div>}
                            <div className="card-footer">
                              <div className="action-row">
                                <a href={`tel:${lead.phone}`} className="action-btn"><Phone size={12}/> {lead.phone || 'No Phone'}</a>
                                <a href={lead.website} target="_blank" className="action-btn"><Globe size={12}/> Web</a>
                              </div>
                              <select className="status-select" value={lead.status} onChange={(e) => updateLeadStatus(lead.id, e.target.value)}>
                                {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button className="convert-sale-btn" onClick={() => openConversionForm(lead)}>
                                🏆 RECORD AS A SALE
                              </button>
                              <button className="notes-btn" onClick={() => { setEditingNotes(editingNotes === lead.id ? null : lead.id); if (editingNotes !== lead.id) setNotesDraft({...notesDraft, [lead.id]: lead.notes || ""}); }}>
                                <BookOpen size={14}/> {lead.notes ? 'EDIT NOTES' : '+ NOTES'}
                              </button>
                              {editingNotes === lead.id && (
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                  <textarea className="notes-area" value={notesDraft[lead.id]} onChange={e => setNotesDraft({...notesDraft, [lead.id]: e.target.value})} autoFocus/>
                                  <button className="notes-save-btn" onClick={() => saveNotes(lead.id)}>SAVE</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : activeTab === 'overview' ? (
          <div className="overview-container">
            <header className="sales-header overview-header">
              <div className="sales-heading">
                <div className="eyebrow">Command Overview</div>
                <h2>Mission Control</h2>
                <p>Quick read on pipeline health, stage balance, industry mix, and recent revenue without leaving the CRM.</p>
              </div>
              <div className="sales-header-panels">
                <div className="metric-card sales-metric-card">
                  <span>Current Tour</span>
                  <strong>{activeCourse?.name || 'General Leads'}</strong>
                </div>
                <div className="metric-card">
                  <span>Primary City</span>
                  <strong>{activeCourse?.defaultLocation || location || 'Not set'}</strong>
                </div>
              </div>
            </header>

            <section className="overview-hero-grid">
              <div className="overview-panel overview-stat-panel">
                <div className="overview-panel-head">
                  <Activity size={18} />
                  <span>Pipeline Snapshot</span>
                </div>
                <div className="overview-stat-grid">
                  <div className="overview-stat-card">
                    <span>Total Leads</span>
                    <strong>{leads.length}</strong>
                  </div>
                  <div className="overview-stat-card">
                    <span>Owner Ready</span>
                    <strong>{ownerReadyCount}</strong>
                  </div>
                  <div className="overview-stat-card">
                    <span>Conversion Rate</span>
                    <strong>{conversionRate}%</strong>
                  </div>
                  <div className="overview-stat-card">
                    <span>Avg Sale</span>
                    <strong>${avgSaleValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>
              </div>

              <div className="overview-panel overview-highlight-panel">
                <div className="overview-panel-head">
                  <ShieldCheck size={18} />
                  <span>Focus Right Now</span>
                </div>
                <h3>{activeDealsCount} active prospects are still in motion.</h3>
                <p>
                  {ownerReadyCount} owner-operated leads are flagged for priority outreach, and {statusSummary[0]?.count || 0}
                  {' '}still sit at the top of funnel in Tee Box.
                </p>
              </div>
            </section>

            <section className="overview-grid">
              <div className="overview-panel">
                <div className="overview-panel-head">
                  <Target size={18} />
                  <span>Stage Breakdown</span>
                </div>
                <div className="overview-stage-list">
                  {statusSummary.map((item) => (
                    <div key={item.column} className="overview-stage-row">
                      <div>
                        <strong>{item.column}</strong>
                        <span>{leads.length ? Math.round((item.count / leads.length) * 100) : 0}% of pipeline</span>
                      </div>
                      <em>{item.count}</em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overview-panel">
                <div className="overview-panel-head">
                  <Map size={18} />
                  <span>Top Verticals</span>
                </div>
                <div className="overview-industry-list">
                  {topIndustries.length > 0 ? topIndustries.map(([industryName, count]) => (
                    <div key={industryName} className="overview-industry-row">
                      <strong>{industryName}</strong>
                      <span>{count} leads</span>
                    </div>
                  )) : (
                    <p className="overview-empty">Run a scan to populate industry insights.</p>
                  )}
                </div>
              </div>

              <div className="overview-panel overview-panel-wide">
                <div className="overview-panel-head">
                  <DollarSign size={18} />
                  <span>Recent Sales</span>
                </div>
                <div className="overview-sales-list">
                  {recentSales.length > 0 ? recentSales.map((sale) => (
                    <div key={sale.id} className="overview-sale-row">
                      <div>
                        <strong>{sale.clientName}</strong>
                        <span>{sale.courseName} • {sale.product}</span>
                      </div>
                      <div>
                        <strong>${sale.price.toLocaleString()}</strong>
                        <span>{sale.date}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="overview-empty">No sales logged yet. Closed deals will appear here.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="sales-container">
            <header className="sales-header">
              <div className="sales-heading">
                <div className="eyebrow">Revenue Board</div>
                <h2>The Money Board</h2>
                <p>Tracking revenue on {PRODUCTS.length} distinct golf assets.</p>
              </div>
              <div className="sales-header-panels">
                <div className="metric-card sales-metric-card">
                  <span>Logged Sales</span>
                  <strong>{sales.length}</strong>
                </div>
                <div className="total-revenue-card">
                  <span>Total Tournament Revenue</span>
                  <strong>${totalRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </header>

            <div className="sales-actions">
              <button className="primary-button sales-log-button" onClick={() => { setConvertingLead(null); setIsSaleFormOpen(true); }}>
                <PlusCircle size={18} /> LOG MANUAL SALE
              </button>
            </div>

            <table className="sales-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Course Facility</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Date</th>
                  <th style={{width: '40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td><strong>{sale.clientName}</strong></td>
                    <td>{sale.courseName}</td>
                    <td><span style={{color: 'var(--text-dim)', fontSize: '0.8rem', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px'}}>{sale.product}</span></td>
                    <td className="sale-price">${sale.price.toLocaleString()}</td>
                    <td style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}>{sale.date}</td>
                    <td><button onClick={() => deleteSale(sale.id)} style={{color: 'var(--text-dim)', opacity: 0.5}}><X size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <div className={`bunker-helper ${isHelperOpen ? 'open' : ''}`}>
        {isHelperOpen && activeHelperTip && (
          <div className="bunker-helper-bubble" role="status" aria-live="polite">
            <div className="bunker-helper-badge">Bunker Caddie</div>
            <h3>{activeHelperTip.title}</h3>
            <p>{activeHelperTip.body}</p>
            <div className="bunker-helper-controls">
              <button
                type="button"
                className="bunker-helper-nav"
                onClick={() => setHelperTipIndex((currentIndex) => (currentIndex - 1 + helperTips.length) % helperTips.length)}
                aria-label="Previous tip"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="bunker-helper-count">
                {helperTipIndex + 1} / {helperTips.length}
              </div>
              <button
                type="button"
                className="bunker-helper-nav"
                onClick={() => setHelperTipIndex((currentIndex) => (currentIndex + 1) % helperTips.length)}
                aria-label="Next tip"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              type="button"
              className="bunker-helper-close"
              onClick={() => setIsHelperOpen(false)}
              aria-label="Close helper"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <button
          type="button"
          className="bunker-helper-trigger"
          onClick={() => setIsHelperOpen(true)}
          aria-label={isHelperOpen ? 'Bunker helper open' : 'Open bunker helper'}
        >
          <span className="bunker-helper-glow"></span>
          <img src="/bunker.png" alt="Bunker helper mascot" className="bunker-helper-image" />
        </button>
      </div>

      {/* Course Creation/Edit Modal */}
      {isCourseModalOpen && (
        <div className="sale-form-overlay">
           <form className="sale-form" onSubmit={handleSubmitCourse}>
              <div className="modal-header">
                <h3>{isEditingCourse ? '✏️ Edit Course Tour Info' : '⛳️ Initialize New Course Tour'}</h3>
                <button type="button" onClick={() => setIsCourseModalOpen(false)}><X size={24} /></button>
              </div>
              <div className="filter-group">
                <label>Course Name</label>
                <input required type="text" className="filter-input" placeholder="e.g. Pine Barrens CC" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>Primary Scouting City</label>
                <input required type="text" className="filter-input" placeholder="e.g. Wareham, MA" value={newCourseLocation} onChange={e => setNewCourseLocation(e.target.value)} />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="primary-button modal-primary">
                  {isEditingCourse ? 'UPDATE INFO' : 'CREATE DATABASE'}
                </button>
                {isEditingCourse && activeCourse.id !== 'default' && (
                  <button type="button" onClick={handleDeleteCourse} className="danger-icon-button">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
           </form>
        </div>
      )}

      {/* Sale Form Modal */}
      {isSaleFormOpen && (
        <div className="sale-form-overlay">
          <form className="sale-form" onSubmit={handleNewSaleSubmit}>
            <div className="modal-header">
              <h3>{convertingLead ? '🏆 Convert to Closed Deal' : '💰 Log New Sale'}</h3>
              <button type="button" onClick={() => setIsSaleFormOpen(false)}><X size={24} /></button>
            </div>
            <div className="filter-group"><label>Client / Business Name</label><input required type="text" className="filter-input" value={saleFormData.clientName} onChange={e => setSaleFormData({...saleFormData, clientName: e.target.value})} /></div>
            <div className="filter-group"><label>Course Sold For</label><input required type="text" className="filter-input" value={saleFormData.courseName} onChange={e => setSaleFormData({...saleFormData, courseName: e.target.value})} /></div>
            <div className="filter-group"><label>Product Type</label>
              <select className="filter-input" value={saleFormData.product} onChange={e => setSaleFormData({...saleFormData, product: e.target.value})}>
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group"><label>Sale Price ($)</label><input required type="number" className="filter-input" value={saleFormData.price} onChange={e => setSaleFormData({...saleFormData, price: e.target.value})} /></div>
            <button type="submit" className="primary-button modal-primary full-width-button">RECORD SALE</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
