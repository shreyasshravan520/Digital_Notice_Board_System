from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Admin(db.Model):
    __tablename__ = 'admin'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Staff')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role
        }

class Category(db.Model):
    __tablename__ = 'category'
    cat_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {
            'cat_id': self.cat_id,
            'name': self.name
        }

class Department(db.Model):
    __tablename__ = 'department'
    dept_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {
            'dept_id': self.dept_id,
            'name': self.name
        }

class Notice(db.Model):
    __tablename__ = 'notice'
    notice_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.cat_id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('department.dept_id'), nullable=False)
    image_url = db.Column(db.String(300), nullable=True)
    priority = db.Column(db.String(50), nullable=False, default='Normal') # Urgent, Normal, Featured
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Active') # Active, Expired, Draft

    # Relationships
    category = db.relationship('Category', backref=db.backref('notices', lazy=True))
    department = db.relationship('Department', backref=db.backref('notices', lazy=True))

    def to_dict(self):
        return {
            'notice_id': self.notice_id,
            'title': self.title,
            'description': self.description,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else '',
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else '',
            'image_url': self.image_url,
            'priority': self.priority,
            'date': self.date.isoformat(),
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'status': self.status
        }

class ActivityLog(db.Model):
    __tablename__ = 'activity_log'
    log_id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(300), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    admin = db.relationship('Admin', backref=db.backref('logs', lazy=True))

    def to_dict(self):
        return {
            'log_id': self.log_id,
            'action': self.action,
            'admin_username': self.admin.username if self.admin else 'System',
            'timestamp': self.timestamp.isoformat()
        }
