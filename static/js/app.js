// Global State for Notices Data
let notices = [];
let categories = [];
let departments = [];
let selectedCategory = 'All';

// ═══ ON LOAD INITIALIZATION ═══
document.addEventListener('DOMContentLoaded', () => {
    // Start Live Clock
    initClock();
    
    // Set Theme Button Status
    updateThemeUI();
    
    // Fetch Data
    fetchPublicNotices();
});

// ═══ THEME MANAGEMENT ═══
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI();
}

function updateThemeUI() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

// ═══ LIVE CLOCK WIDGET ═══
function initClock() {
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    const heroGreeting = document.getElementById('hero-greeting');

    function updateTime() {
        const now = new Date();
        
        // Time string (HH:MM:SS)
        let hrs = now.getHours();
        let mins = now.getMinutes();
        let secs = now.getSeconds();
        
        hrs = hrs < 10 ? '0' + hrs : hrs;
        mins = mins < 10 ? '0' + mins : mins;
        secs = secs < 10 ? '0' + secs : secs;
        
        clockTime.textContent = `${hrs}:${mins}:${secs}`;
        
        // Date string (Day, Month DD, YYYY)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const dayName = days[now.getDay()];
        const monthName = months[now.getMonth()];
        const dayNum = now.getDate();
        const year = now.getFullYear();
        
        clockDate.textContent = `${dayName}, ${monthName} ${dayNum}, ${year}`;
        
        // Hero Greeting based on hour
        const hour = now.getHours();
        if (hour < 12) {
            heroGreeting.textContent = 'Good Morning';
        } else if (hour < 17) {
            heroGreeting.textContent = 'Good Afternoon';
        } else {
            heroGreeting.textContent = 'Good Evening';
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
}

// ═══ SCROLL TO NOTICES UTILITY ═══
function scrollToNotices() {
    document.getElementById('notices-section').scrollIntoView({ behavior: 'smooth' });
}

// ═══ FETCH PUBLIC NOTICES API ═══
async function fetchPublicNotices() {
    try {
        const response = await fetch('/api/public-notices');
        if (!response.ok) throw new Error('Failed to fetch notices.');
        
        const data = await response.json();
        notices = data.notices || [];
        categories = data.categories || [];
        departments = data.departments || [];
        
        // Populate Filter Selectors
        populateFilters();
        
        // Render Statistics Info
        renderStats();
        
        // Render Featured Spotlights
        renderFeatured();
        
        // Render Notices Grid
        renderNoticesGrid(notices);
        
    } catch (error) {
        console.error('Error fetching public notices:', error);
        document.getElementById('notices-grid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--urgent-red);">
                <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom: 1rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Failed to load notices. Please refresh the page.</p>
            </div>
        `;
    }
}

// ═══ POPULATE FILTER DROPDOWNS & CHIPS ═══
function populateFilters() {
    // 1. Populate Department Dropdown
    const deptFilter = document.getElementById('dept-filter');
    deptFilter.innerHTML = '<option value="All">All Departments</option>';
    departments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.dept_id;
        opt.textContent = dept.name;
        deptFilter.appendChild(opt);
    });
    
    // 2. Populate Category Filter Chips
    const chipsContainer = document.getElementById('category-chips');
    chipsContainer.innerHTML = '<button class="chip active" data-cat="All" onclick="selectCategory(this)">All</button>';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.setAttribute('data-cat', cat.cat_id);
        btn.textContent = cat.name;
        btn.onclick = () => selectCategory(btn);
        chipsContainer.appendChild(btn);
    });
}

// ═══ RENDER STATS BAR ═══
function renderStats() {
    document.getElementById('stat-total').textContent = notices.length;
    
    const urgentCount = notices.filter(n => n.priority === 'Urgent').length;
    document.getElementById('stat-urgent').textContent = urgentCount;
    
    document.getElementById('stat-depts').textContent = departments.length;
    document.getElementById('stat-categories').textContent = categories.length;
}

// ═══ RENDER FEATURED SPOTLIGHT ═══
function renderFeatured() {
    const featuredSection = document.getElementById('featured-section');
    
    // Find active featured notice
    const featured = notices.find(n => n.priority === 'Featured');
    
    if (!featured) {
        featuredSection.style.display = 'none';
        return;
    }
    
    featuredSection.style.display = 'block';
    document.getElementById('featured-title').textContent = featured.title;
    document.getElementById('featured-desc').textContent = featured.description;
    
    // Meta tags
    document.getElementById('featured-dept').innerHTML = `
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        ${featured.department_name}
    `;
    
    const dateFormatted = new Date(featured.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('featured-date').innerHTML = `
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${dateFormatted}
    `;
    
    // Image Handling
    const imgDiv = document.getElementById('featured-image');
    if (featured.image_url) {
        imgDiv.style.backgroundImage = `url('${featured.image_url}')`;
        imgDiv.style.backgroundSize = 'cover';
        imgDiv.style.backgroundPosition = 'center';
        imgDiv.innerHTML = '';
    } else {
        imgDiv.style.backgroundImage = 'none';
        imgDiv.innerHTML = `
            <div class="featured-image-placeholder">
                <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
        `;
    }
    
    // Add Click action to Featured card
    document.getElementById('featured-card').onclick = () => openNoticeDetails(featured.notice_id);
}

// ═══ RENDER NOTICES GRID ═══
function renderNoticesGrid(items) {
    const grid = document.getElementById('notices-grid');
    const counter = document.getElementById('notices-count');
    
    counter.textContent = `(${items.length} ${items.length === 1 ? 'Notice' : 'Notices'})`;
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--txt-muted);">
                <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom: 1rem; opacity: 0.4;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>No notices matching the active filter criteria were found.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    items.forEach((notice, index) => {
        const card = document.createElement('div');
        card.className = 'glass-card notice-card';
        card.style.animation = `fade-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s both`;
        card.onclick = () => openNoticeDetails(notice.notice_id);
        
        // Priority Badge Class
        let priorityClass = 'priority-normal';
        if (notice.priority === 'Urgent') priorityClass = 'priority-urgent';
        if (notice.priority === 'Featured') priorityClass = 'priority-featured';
        
        // Image Section HTML
        let imageHTML = '';
        if (notice.image_url) {
            imageHTML = `<div class="notice-img" style="background-image: url('${notice.image_url}');"></div>`;
        }
        
        // Formatting Dates
        const pubDate = new Date(notice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const expDate = notice.expiry_date ? new Date(notice.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
        
        card.innerHTML = `
            <span class="card-header-badge ${priorityClass}">${notice.priority}</span>
            ${imageHTML}
            <div class="notice-card-body">
                <div class="notice-card-top-meta">
                    <span>${notice.department_name}</span>
                    <span>${notice.category_name}</span>
                </div>
                <h3 class="notice-card-title">${notice.title}</h3>
                <p class="notice-card-desc">${notice.description}</p>
                <div class="notice-card-footer">
                    <span>
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Posted: ${pubDate}
                    </span>
                    ${expDate ? `
                    <span>
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Expiry: ${expDate}
                    </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Add animation stylesheet rule dynamically if not loaded
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fade-slide-up {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleSheet);

// ═══ CHIP FILTER NAVIGATION ═══
function selectCategory(buttonElement) {
    // Remove active state from all chips
    const chips = document.querySelectorAll('#category-chips .chip');
    chips.forEach(c => c.classList.remove('active'));
    
    // Set active state on clicked chip
    buttonElement.classList.add('active');
    selectedCategory = buttonElement.getAttribute('data-cat');
    
    filterNotices();
}

function selectCategoryByName(name) {
    scrollToNotices();
    setTimeout(() => {
        const chips = document.querySelectorAll('#category-chips .chip');
        chips.forEach(c => {
            if (c.textContent.trim().toLowerCase() === name.toLowerCase()) {
                c.click();
            }
        });
    }, 100);
}

// ═══ SEARCH & FILTER IMPLEMENTATION ═══
function filterNotices() {
    const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
    const deptVal = document.getElementById('dept-filter').value;
    const priorityVal = document.getElementById('priority-filter').value;
    const sortVal = document.getElementById('sort-filter').value;
    
    let filtered = [...notices];
    
    // 1. Search Query filter
    if (searchVal) {
        filtered = filtered.filter(n => 
            n.title.toLowerCase().includes(searchVal) || 
            n.description.toLowerCase().includes(searchVal)
        );
    }
    
    // 2. Category Chip filter
    if (selectedCategory !== 'All') {
        filtered = filtered.filter(n => n.category_id.toString() === selectedCategory);
    }
    
    // 3. Department dropdown filter
    if (deptVal !== 'All') {
        filtered = filtered.filter(n => n.department_id.toString() === deptVal);
    }
    
    // 4. Priority dropdown filter
    if (priorityVal !== 'All') {
        filtered = filtered.filter(n => n.priority === priorityVal);
    }
    
    // 5. Sorting implementation
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortVal === 'priority') {
        const priorityWeight = { 'Urgent': 3, 'Featured': 2, 'Normal': 1 };
        filtered.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
    }
    
    renderNoticesGrid(filtered);
}

// ═══ NOTICE DETAIL MODAL POPUP ═══
function openNoticeDetails(id) {
    const notice = notices.find(n => n.notice_id === id);
    if (!notice) return;
    
    const modal = document.getElementById('notice-modal');
    
    // Set priority badge
    const badge = document.getElementById('modal-badge');
    badge.className = 'modal-badge';
    badge.textContent = notice.priority;
    if (notice.priority === 'Urgent') badge.classList.add('badge-urgent');
    else if (notice.priority === 'Featured') badge.classList.add('badge-featured');
    else badge.classList.add('badge-normal');
    
    // Text contents
    document.getElementById('modal-title').textContent = notice.title;
    document.getElementById('modal-desc').textContent = notice.description;
    
    // Meta fields
    document.getElementById('modal-dept').innerHTML = `<strong>Dept:</strong> ${notice.department_name}`;
    document.getElementById('modal-cat').innerHTML = `<strong>Category:</strong> ${notice.category_name}`;
    
    const pubDate = new Date(notice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('modal-date').innerHTML = `<strong>Posted:</strong> ${pubDate}`;
    
    const expiry = document.getElementById('modal-expiry');
    if (notice.expiry_date) {
        const expDate = new Date(notice.expiry_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        expiry.innerHTML = `<strong>Expires:</strong> ${expDate}`;
        expiry.style.display = 'inline';
    } else {
        expiry.style.display = 'none';
    }
    
    // Image content
    const imgEl = document.getElementById('modal-image');
    if (notice.image_url) {
        imgEl.src = notice.image_url;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
        imgEl.src = '';
    }
    
    // Open Overlay
    modal.classList.add('active');
}

// Close Modal wrapper
function closeModal(event) {
    const modal = document.getElementById('notice-modal');
    const container = document.getElementById('modal-container');
    if (event.target === modal) {
        modal.classList.remove('active');
    }
}
