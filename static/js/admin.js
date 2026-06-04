// Admin Portal Dashboard Core State
let adminNotices = [];
let adminCats = [];
let adminDepts = [];
let chartData = [];
let currentUser = null;

// ═══ ON LOAD CHECK AUTH ═══
document.addEventListener('DOMContentLoaded', () => {
    // Check if session exists in cookie/storage or try stats fetch
    checkSessionState();
});

// ═══ AUTHENTICATION SYSTEM ═══
async function checkSessionState() {
    try {
        // Fetch dashboard statistics to check if session is active
        const response = await fetch('/api/stats');
        if (response.ok) {
            const data = await response.json();
            currentUser = { username: 'admin', role: 'Administrator' }; // Set placeholder since stats returned ok
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('admin-workspace').style.display = 'flex';
            
            // Set User profile info
            setUserProfile();
            
            // Process Stats data
            processStatsResponse(data);
        } else {
            showLoginScreen();
        }
    } catch (e) {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('admin-workspace').style.display = 'none';
}

function setUserProfile() {
    if (currentUser) {
        document.getElementById('user-display').textContent = currentUser.username;
        document.getElementById('role-display').textContent = currentUser.role;
        document.getElementById('avatar-initial').textContent = currentUser.username.charAt(0).toUpperCase();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    
    errorEl.style.display = 'none';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userVal, password: passVal })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('admin-workspace').style.display = 'flex';
            
            setUserProfile();
            showToast('Authenticated successfully!');
            
            // Fetch whole workspace data
            fetchWorkspaceData();
        } else {
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Server connection error. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            currentUser = null;
            showLoginScreen();
            showToast('Logged out successfully.');
        }
    } catch (e) {
        showLoginScreen();
    }
}

// ═══ NAVIGATION PANEL SWITCHING ═══
function switchPanel(activeNav) {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const viewPanels = document.querySelectorAll('.admin-view-panel');
    
    // Switch active nav item class
    navItems.forEach(item => item.classList.remove('active'));
    activeNav.classList.add('active');
    
    // Switch view panels visibility
    const target = activeNav.getAttribute('data-target');
    viewPanels.forEach(panel => {
        if (panel.id === target) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    // If target is categories, load settings lists
    if (target === 'panel-categories') {
        renderSettingsLists();
    }
    
    // Re-fetch workspace when switching views to ensure synchrony
    fetchWorkspaceData();
}

// ═══ FETCH WORKSPACE STATS & LISTS ═══
async function fetchWorkspaceData() {
    try {
        const statsRes = await fetch('/api/stats');
        if (!statsRes.ok) {
            if (statsRes.status === 401) {
                showLoginScreen();
                return;
            }
            throw new Error('Failed to retrieve system overview metrics.');
        }
        
        const data = await statsRes.json();
        processStatsResponse(data);
        
        // Also fetch admin CRUD notices list
        const noticesRes = await fetch('/api/admin-notices');
        if (noticesRes.ok) {
            const noticesData = await noticesRes.json();
            adminNotices = noticesData.notices || [];
            renderNoticesTable(adminNotices);
        }
        
    } catch (error) {
        console.error('Workspace fetch error:', error);
    }
}

function processStatsResponse(data) {
    // 1. Populate Metrics Numbers
    document.getElementById('m-total').textContent = data.total_notices || 0;
    document.getElementById('m-urgent').textContent = data.urgent_notices || 0;
    document.getElementById('m-categories').textContent = data.total_categories || 0;
    document.getElementById('m-depts').textContent = data.total_departments || 0;
    
    // Cache variables
    adminCats = data.categories || [];
    adminDepts = data.departments || [];
    chartData = data.chart_data || [];
    
    // Populate form option selectors
    populateFormSelectOptions();
    
    // 2. Populate Activity Log list
    renderActivityLogs(data.logs || []);
    
    // 3. Render SVG Timeline chart
    renderTimelineChart(chartData);
}

// ═══ POPULATE FORM FIELD SELECT OPTIONS ═══
function populateFormSelectOptions() {
    const fCat = document.getElementById('f-cat');
    const fDept = document.getElementById('f-dept');
    const tableFilterCat = document.getElementById('table-filter-cat');
    
    // Form Category
    fCat.innerHTML = '';
    adminCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.cat_id;
        opt.textContent = cat.name;
        fCat.appendChild(opt);
    });
    
    // Form Department
    fDept.innerHTML = '';
    adminDepts.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.dept_id;
        opt.textContent = dept.name;
        fDept.appendChild(opt);
    });
    
    // Table Filter Category
    tableFilterCat.innerHTML = '<option value="All">All Categories</option>';
    adminCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.cat_id;
        opt.textContent = cat.name;
        tableFilterCat.appendChild(opt);
    });
}

// ═══ RENDER SYSTEM TIMELINE GRAPH (SVG) ═══
function renderTimelineChart(points) {
    const svg = document.getElementById('timeline-svg');
    const gridG = document.getElementById('grid-lines');
    const linePath = document.getElementById('timeline-line');
    const areaPath = document.getElementById('timeline-area');
    const pointsG = document.getElementById('timeline-points');
    const labelsG = document.getElementById('axis-labels');
    
    // Clear previous
    gridG.innerHTML = '';
    pointsG.innerHTML = '';
    labelsG.innerHTML = '';
    
    if (points.length === 0) return;
    
    const svgWidth = 500;
    const svgHeight = 220;
    const paddingX = 40;
    const paddingY = 30;
    
    const chartW = svgWidth - paddingX * 2;
    const chartH = svgHeight - paddingY * 2;
    
    // Find Max Value
    const maxVal = Math.max(...points.map(p => p.count), 4); // default axis scale to min 4
    
    // Render horizontal grid lines
    const gridCounts = 4;
    for (let i = 0; i <= gridCounts; i++) {
        const y = paddingY + (chartH / gridCounts) * i;
        const gridVal = Math.round(maxVal - (maxVal / gridCounts) * i);
        
        // Grid Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingX);
        line.setAttribute('y1', y);
        line.setAttribute('x2', svgWidth - paddingX);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'chart-grid-line');
        gridG.appendChild(line);
        
        // Axis Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', paddingX - 10);
        text.setAttribute('y', y + 3);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('class', 'chart-axis-text');
        text.textContent = gridVal;
        labelsG.appendChild(text);
    }
    
    // Calculate Point coordinates
    const coords = [];
    points.forEach((p, idx) => {
        const x = paddingX + (chartW / (points.length - 1 || 1)) * idx;
        const y = paddingY + chartH - (chartH * p.count / maxVal);
        coords.push({ x, y, date: p.date, count: p.count });
    });
    
    // Create Line Paths
    let lineD = '';
    let areaD = `M ${paddingX} ${paddingY + chartH} `;
    
    coords.forEach((c, idx) => {
        if (idx === 0) {
            lineD += `M ${c.x} ${c.y} `;
        } else {
            lineD += `L ${c.x} ${c.y} `;
        }
        areaD += `L ${c.x} ${c.y} `;
    });
    
    areaD += `L ${coords[coords.length - 1].x} ${paddingY + chartH} Z`;
    
    linePath.setAttribute('d', lineD);
    areaPath.setAttribute('d', areaD);
    
    // Create Point circles & date labels
    coords.forEach((c, idx) => {
        // Point
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', c.x);
        circle.setAttribute('cy', c.y);
        circle.setAttribute('r', '5');
        circle.setAttribute('class', 'chart-point');
        
        // Tooltip title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${c.date}: ${c.count} Notices`;
        circle.appendChild(title);
        pointsG.appendChild(circle);
        
        // Date Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', c.x);
        text.setAttribute('y', paddingY + chartH + 18);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'chart-axis-text');
        
        // Format YYYY-MM-DD to Short MM-DD
        const parts = c.date.split('-');
        text.textContent = parts.length > 2 ? `${parts[1]}/${parts[2]}` : c.date;
        
        labelsG.appendChild(text);
    });
}

// ═══ RENDER SYSTEM LOG PANEL ═══
function renderActivityLogs(logs) {
    const list = document.getElementById('activity-log-list');
    if (logs.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:2rem 0;color:var(--txt-muted);font-size:0.85rem;">No activity log recorded yet.</div>';
        return;
    }
    
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        const isSystem = log.admin_username === 'System';
        item.className = `activity-item ${isSystem ? 'system' : ''}`;
        
        const timestampFormatted = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        item.innerHTML = `
            <span class="activity-text"><strong>${log.admin_username}</strong>: ${log.action}</span>
            <span class="activity-time">${timestampFormatted}</span>
        `;
        
        list.appendChild(item);
    });
}

// ═══ RENDER NOTICES CRUD TABLE ═══
function renderNoticesTable(items) {
    const body = document.getElementById('notices-table-body');
    if (items.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 3rem 0; color: var(--txt-muted)">No college announcements recorded yet.</td></tr>`;
        return;
    }
    
    body.innerHTML = '';
    items.forEach(notice => {
        const tr = document.createElement('tr');
        
        // Status Badge styling
        let statusBadge = `<span class="badge-status active">Active</span>`;
        if (notice.status === 'Expired') statusBadge = `<span class="badge-status expired">Expired</span>`;
        else if (notice.status === 'Draft') statusBadge = `<span class="badge-status draft">Draft</span>`;
        
        // Priority Badge styling
        let priorityBadge = `<span class="badge-priority normal">Normal</span>`;
        if (notice.priority === 'Urgent') priorityBadge = `<span class="badge-priority urgent">Urgent</span>`;
        else if (notice.priority === 'Featured') priorityBadge = `<span class="badge-priority featured">Featured</span>`;
        
        const pubDate = new Date(notice.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        
        tr.innerHTML = `
            <td>
                <div class="notice-row-title">${notice.title}</div>
                <div style="font-size:0.75rem; color:var(--txt-muted); max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${notice.description}</div>
            </td>
            <td>${notice.category_name}</td>
            <td>${notice.department_name}</td>
            <td>${priorityBadge}</td>
            <td>${pubDate}</td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
                <div class="action-buttons" style="justify-content:flex-end;">
                    <button class="btn-action-icon edit" onclick="openEditModal(${notice.notice_id})" title="Edit notice">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-action-icon delete" onclick="confirmDeleteNotice(${notice.notice_id})" title="Delete notice">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        
        body.appendChild(tr);
    });
}

// ═══ TABLE FILTER & LIVE SEARCH ═══
function filterTable() {
    const searchVal = document.getElementById('table-search').value.toLowerCase().trim();
    const catVal = document.getElementById('table-filter-cat').value;
    const statusVal = document.getElementById('table-filter-status').value;
    
    let filtered = [...adminNotices];
    
    if (searchVal) {
        filtered = filtered.filter(n => 
            n.title.toLowerCase().includes(searchVal) || 
            n.description.toLowerCase().includes(searchVal)
        );
    }
    
    if (catVal !== 'All') {
        filtered = filtered.filter(n => n.category_id.toString() === catVal);
    }
    
    if (statusVal !== 'All') {
        filtered = filtered.filter(n => n.status === statusVal);
    }
    
    renderNoticesTable(filtered);
}

// ═══ EDIT / CREATE NOTICE DIALOGS ═══
function openCreateModal() {
    // Reset Form fields
    document.getElementById('notice-edit-id').value = '';
    document.getElementById('notice-editor-form').reset();
    document.getElementById('modal-editor-title').textContent = 'Publish New Announcement';
    
    // Clear Image Upload preview
    removeUploadedImage();
    
    // Open Dialog
    document.getElementById('editor-modal').classList.add('active');
}

function openEditModal(id) {
    const notice = adminNotices.find(n => n.notice_id === id);
    if (!notice) return;
    
    document.getElementById('notice-edit-id').value = notice.notice_id;
    document.getElementById('f-title').value = notice.title;
    document.getElementById('f-desc').value = notice.description;
    document.getElementById('f-cat').value = notice.category_id;
    document.getElementById('f-dept').value = notice.department_id;
    document.getElementById('f-priority').value = notice.priority;
    document.getElementById('f-status').value = notice.status;
    
    // Expiry Date format conversion (ISO to Date Input standard YYYY-MM-DD)
    if (notice.expiry_date) {
        document.getElementById('f-expiry').value = notice.expiry_date.split('T')[0];
    } else {
        document.getElementById('f-expiry').value = '';
    }
    
    // Preview Image URL if active
    const previewWrapper = document.getElementById('upload-preview-wrapper');
    const previewImg = document.getElementById('upload-preview-img');
    const labelText = document.getElementById('upload-label-text');
    
    if (notice.image_url) {
        previewImg.src = notice.image_url;
        previewWrapper.style.display = 'block';
        labelText.textContent = 'Change banner image';
    } else {
        removeUploadedImage();
    }
    
    document.getElementById('modal-editor-title').textContent = 'Modify announcement details';
    document.getElementById('editor-modal').classList.add('active');
}

function closeEditorModal() {
    document.getElementById('editor-modal').classList.remove('active');
}

// ═══ BANNER IMAGE FILE UPLOAD PREVIEW ═══
function previewUploadImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewWrapper = document.getElementById('upload-preview-wrapper');
            const previewImg = document.getElementById('upload-preview-img');
            const labelText = document.getElementById('upload-label-text');
            
            previewImg.src = e.target.result;
            previewWrapper.style.display = 'block';
            labelText.textContent = 'Banner image added';
        };
        reader.readAsDataURL(file);
    }
}

function removeUploadedImage(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    
    // Clear Input File value
    const input = document.getElementById('f-image');
    input.value = '';
    
    const previewWrapper = document.getElementById('upload-preview-wrapper');
    const previewImg = document.getElementById('upload-preview-img');
    const labelText = document.getElementById('upload-label-text');
    
    previewImg.src = '';
    previewWrapper.style.display = 'none';
    labelText.textContent = 'Click here to choose an image banner';
}

// ═══ CRUD: NOTICE CREATE / UPDATE API CALL ═══
async function saveNotice(e) {
    e.preventDefault();
    
    const id = document.getElementById('notice-edit-id').value;
    const form = document.getElementById('notice-editor-form');
    
    // Utilize Form Data payload format to simplify binary file upload support
    const formData = new FormData();
    formData.append('title', document.getElementById('f-title').value);
    formData.append('description', document.getElementById('f-desc').value);
    formData.append('category_id', document.getElementById('f-cat').value);
    formData.append('department_id', document.getElementById('f-dept').value);
    formData.append('priority', document.getElementById('f-priority').value);
    formData.append('status', document.getElementById('f-status').value);
    
    const expiry = document.getElementById('f-expiry').value;
    formData.append('expiry_date', expiry);
    
    const imageInput = document.getElementById('f-image');
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }
    
    let url = '/api/notices';
    let method = 'POST';
    
    // If edit mode
    if (id) {
        url = `/api/notices/${id}`;
        method = 'PUT';
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            body: formData // Body is FormData
        });
        
        if (response.ok) {
            closeEditorModal();
            showToast(id ? 'Announcement updated successfully!' : 'Announcement published successfully!');
            fetchWorkspaceData();
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to save notice. Please review inputs.');
        }
    } catch (error) {
        alert('Server validation/communication error occurred.');
    }
}

// ═══ CRUD: NOTICE DELETE API CALL ═══
async function confirmDeleteNotice(id) {
    const notice = adminNotices.find(n => n.notice_id === id);
    if (!notice) return;
    
    if (confirm(`Are you sure you want to permanently delete notice: "${notice.title}"?`)) {
        try {
            const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Announcement removed successfully.');
                fetchWorkspaceData();
            } else {
                alert('Failed to delete announcement.');
            }
        } catch (e) {
            alert('Server request failed.');
        }
    }
}

// ═══ SETTINGS: DEPARTMENTS & CATEGORIES LIST RENDERS ═══
function renderSettingsLists() {
    const catList = document.getElementById('category-settings-list');
    const deptList = document.getElementById('department-settings-list');
    
    // Categories List
    catList.innerHTML = '';
    adminCats.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'settings-list-item';
        div.innerHTML = `
            <span>${cat.name}</span>
            <button class="btn-action-icon delete" onclick="deleteCategoryItem(${cat.cat_id})" title="Delete tag">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        `;
        catList.appendChild(div);
    });
    
    // Departments List
    deptList.innerHTML = '';
    adminDepts.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'settings-list-item';
        div.innerHTML = `
            <span>${dept.name}</span>
            <button class="btn-action-icon delete" onclick="deleteDepartmentItem(${dept.dept_id})" title="Delete department">
                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        `;
        deptList.appendChild(div);
    });
}

// ═══ CRUD: ADD CATEGORY ITEM ═══
async function handleAddCategory(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new-cat-name');
    const name = nameInput.value.trim();
    if (!name) return;
    
    try {
        const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (res.ok) {
            nameInput.value = '';
            showToast('Category created.');
            fetchWorkspaceData().then(() => renderSettingsLists());
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to add category.');
        }
    } catch (e) {
        alert('Server communication error.');
    }
}

// ═══ CRUD: DELETE CATEGORY ITEM ═══
async function deleteCategoryItem(id) {
    if (confirm('Delete this notice category classification?')) {
        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Category classification removed.');
                fetchWorkspaceData().then(() => renderSettingsLists());
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to remove category. Verify it is not currently assigned to active notices.');
            }
        } catch (e) {
            alert('Request failed.');
        }
    }
}

// ═══ CRUD: ADD DEPARTMENT ITEM ═══
async function handleAddDepartment(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new-dept-name');
    const name = nameInput.value.trim();
    if (!name) return;
    
    try {
        const res = await fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (res.ok) {
            nameInput.value = '';
            showToast('Department code registered.');
            fetchWorkspaceData().then(() => renderSettingsLists());
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to register department.');
        }
    } catch (e) {
        alert('Server connection issues.');
    }
}

// ═══ CRUD: DELETE DEPARTMENT ITEM ═══
async function deleteDepartmentItem(id) {
    if (confirm('Delete this college department code registration?')) {
        try {
            const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Department registration removed.');
                fetchWorkspaceData().then(() => renderSettingsLists());
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to remove department code. Verify it is not currently assigned to active notices.');
            }
        } catch (e) {
            alert('Request failed.');
        }
    }
}

// ═══ SYSTEM ALERTS TOAST UTILITY ═══
function showToast(message) {
    const toast = document.getElementById('toast-el');
    const text = document.getElementById('toast-text');
    
    text.textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}
