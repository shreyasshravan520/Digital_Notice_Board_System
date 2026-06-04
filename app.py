import os
from datetime import datetime
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from models import db, Admin, Category, Department, Notice, ActivityLog

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY", "dev-secret-key")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Image Upload Configuration
os.makedirs("static/uploads", exist_ok=True)
app.config["UPLOAD_FOLDER"] = "static/uploads"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

db.init_app(app)

with app.app_context():
    db.create_all()
    if not Admin.query.first():
        from werkzeug.security import generate_password_hash
        admin_user = Admin(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='Administrator'
        )
        db.session.add(admin_user)
        db.session.commit()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Dynamic notice expiration check
def check_and_update_expirations():
    now = datetime.utcnow()
    expired_notices = Notice.query.filter(
        Notice.status == 'Active',
        Notice.expiry_date != None,
        Notice.expiry_date < now
    ).all()
    
    if expired_notices:
        for notice in expired_notices:
            notice.status = 'Expired'
            log = ActivityLog(
                action=f"System automatically expired notice: '{notice.title}'",
                admin_id=None
            )
            db.session.add(log)
        db.session.commit()

# Authentication Decorator
def login_required(f):
    import functools
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'error': 'Unauthorized access'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Page routes
@app.route('/')
def index():
    check_and_update_expirations()
    return render_template('index.html')

@app.route('/admin')
def admin_page():
    check_and_update_expirations()
    return render_template('admin.html')

# API Endpoints
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
        
    admin = Admin.query.filter_by(username=username).first()
    if admin and check_password_hash(admin.password_hash, password):
        session['admin_id'] = admin.id
        session['username'] = admin.username
        session['role'] = admin.role
        
        # Log action
        log = ActivityLog(
            action=f"Admin '{username}' logged in successfully.",
            admin_id=admin.id
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': {
                'id': admin.id,
                'username': admin.username,
                'role': admin.role
            }
        })
        
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    username = session.get('username')
    admin_id = session.get('admin_id')
    
    session.clear()
    
    if username:
        log = ActivityLog(
            action=f"Admin '{username}' logged out.",
            admin_id=admin_id
        )
        db.session.add(log)
        db.session.commit()
        
    return jsonify({'success': True})

@app.route('/api/public-notices', methods=['GET'])
def get_public_notices():
    check_and_update_expirations()
    
    # Return active and unexpired notices
    notices = Notice.query.filter_by(status='Active').order_by(Notice.date.desc()).all()
    categories = Category.query.all()
    departments = Department.query.all()
    
    return jsonify({
        'notices': [n.to_dict() for n in notices],
        'categories': [c.to_dict() for c in categories],
        'departments': [d.to_dict() for d in departments]
    })

@app.route('/api/admin-notices', methods=['GET'])
@login_required
def get_admin_notices():
    check_and_update_expirations()
    notices = Notice.query.order_by(Notice.date.desc()).all()
    return jsonify({'notices': [n.to_dict() for n in notices]})

@app.route('/api/notices', methods=['POST'])
@login_required
def add_notice():
    title = request.form.get('title')
    description = request.form.get('description')
    category_id = request.form.get('category_id', type=int)
    department_id = request.form.get('department_id', type=int)
    priority = request.form.get('priority', 'Normal')
    expiry_date_str = request.form.get('expiry_date')
    status = request.form.get('status', 'Active')
    
    if not title or not description or not category_id or not department_id:
        return jsonify({'error': 'Missing required fields'}), 400
        
    image_url = None
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{int(datetime.utcnow().timestamp())}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            image_url = f"/static/uploads/{filename}"
            
    expiry_date = None
    if expiry_date_str:
        try:
            expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
            except ValueError:
                pass
                
    notice = Notice(
        title=title,
        description=description,
        category_id=category_id,
        department_id=department_id,
        priority=priority,
        expiry_date=expiry_date,
        status=status,
        image_url=image_url
    )
    db.session.add(notice)
    
    # Log Action
    log = ActivityLog(
        action=f"Created notice: '{title}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True, 'notice': notice.to_dict()}), 201

@app.route('/api/notices/<int:id>', methods=['PUT'])
@login_required
def edit_notice(id):
    notice = Notice.query.get_or_404(id)
    
    # Use form data if available, otherwise JSON
    if request.form:
        title = request.form.get('title')
        description = request.form.get('description')
        category_id = request.form.get('category_id', type=int)
        department_id = request.form.get('department_id', type=int)
        priority = request.form.get('priority')
        expiry_date_str = request.form.get('expiry_date')
        status = request.form.get('status')
        
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                filename = secure_filename(f"{int(datetime.utcnow().timestamp())}_{file.filename}")
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                # Remove old file if it exists
                if notice.image_url and notice.image_url.startswith('/static/uploads/'):
                    old_path = os.path.join(app.root_path, notice.image_url.lstrip('/'))
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except OSError:
                            pass
                notice.image_url = f"/static/uploads/{filename}"
    else:
        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description')
        category_id = data.get('category_id')
        department_id = data.get('department_id')
        priority = data.get('priority')
        expiry_date_str = data.get('expiry_date')
        status = data.get('status')
        
    if title: notice.title = title
    if description: notice.description = description
    if category_id: notice.category_id = category_id
    if department_id: notice.department_id = department_id
    if priority: notice.priority = priority
    if status: notice.status = status
    
    if expiry_date_str is not None:
        if expiry_date_str == '':
            notice.expiry_date = None
        else:
            try:
                notice.expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
            except ValueError:
                try:
                    notice.expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
                except ValueError:
                    pass

    # Log Action
    log = ActivityLog(
        action=f"Updated notice ID {id}: '{notice.title}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True, 'notice': notice.to_dict()})

@app.route('/api/notices/<int:id>', methods=['DELETE'])
@login_required
def delete_notice(id):
    notice = Notice.query.get_or_404(id)
    title = notice.title
    
    # Remove image file if it exists
    if notice.image_url and notice.image_url.startswith('/static/uploads/'):
        filepath = os.path.join(app.root_path, notice.image_url.lstrip('/'))
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
                
    db.session.delete(notice)
    
    # Log Action
    log = ActivityLog(
        action=f"Deleted notice: '{title}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/categories', methods=['POST'])
@login_required
def add_category():
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
        
    if Category.query.filter_by(name=name).first():
        return jsonify({'error': 'Category already exists'}), 400
        
    cat = Category(name=name)
    db.session.add(cat)
    
    log = ActivityLog(
        action=f"Added category: '{name}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True, 'category': cat.to_dict()}), 201

@app.route('/api/categories/<int:id>', methods=['DELETE'])
@login_required
def delete_category(id):
    cat = Category.query.get_or_404(id)
    name = cat.name
    
    # Check if category is in use
    if Notice.query.filter_by(category_id=id).first():
        return jsonify({'error': 'Cannot delete category that is in use by active notices'}), 400
        
    db.session.delete(cat)
    
    log = ActivityLog(
        action=f"Deleted category: '{name}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/departments', methods=['POST'])
@login_required
def add_department():
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Department name is required'}), 400
        
    if Department.query.filter_by(name=name).first():
        return jsonify({'error': 'Department already exists'}), 400
        
    dept = Department(name=name)
    db.session.add(dept)
    
    log = ActivityLog(
        action=f"Added department: '{name}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True, 'department': dept.to_dict()}), 201

@app.route('/api/departments/<int:id>', methods=['DELETE'])
@login_required
def delete_department(id):
    dept = Department.query.get_or_404(id)
    name = dept.name
    
    # Check if department is in use
    if Notice.query.filter_by(department_id=id).first():
        return jsonify({'error': 'Cannot delete department that is in use by active notices'}), 400
        
    db.session.delete(dept)
    
    log = ActivityLog(
        action=f"Deleted department: '{name}'",
        admin_id=session.get('admin_id')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    check_and_update_expirations()
    
    total_notices = Notice.query.count()
    urgent_notices = Notice.query.filter_by(priority='Urgent', status='Active').count()
    featured_notices = Notice.query.filter_by(priority='Featured', status='Active').count()
    total_categories = Category.query.count()
    total_departments = Department.query.count()
    
    # Recent logs
    logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(15).all()
    
    # Categories list and Departments list
    categories = Category.query.all()
    departments = Department.query.all()
    
    # Dataset for chart: notices count by category
    categories_stats = []
    for cat in categories:
        count = Notice.query.filter_by(category_id=cat.cat_id).count()
        categories_stats.append({
            'name': cat.name,
            'count': count
        })
        
    # Dataset for line chart: notice counts by date over last 7 days
    from collections import defaultdict
    date_counts = defaultdict(int)
    notices = Notice.query.all()
    for n in notices:
        date_str = n.date.strftime('%Y-%m-%d')
        date_counts[date_str] += 1
        
    # Sort and take last 7 days
    sorted_dates = sorted(date_counts.keys())[-7:]
    chart_data = [{'date': d, 'count': date_counts[d]} for d in sorted_dates]
    
    # If no data, fill with today
    if not chart_data:
        chart_data = [{'date': datetime.utcnow().strftime('%Y-%m-%d'), 'count': 0}]
        
    return jsonify({
        'total_notices': total_notices,
        'urgent_notices': urgent_notices,
        'featured_notices': featured_notices,
        'total_categories': total_categories,
        'total_departments': total_departments,
        'logs': [l.to_dict() for l in logs],
        'categories': [c.to_dict() for c in categories],
        'departments': [d.to_dict() for d in departments],
        'category_stats': categories_stats,
        'chart_data': chart_data
    })

if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    app.run(debug=debug_mode)
