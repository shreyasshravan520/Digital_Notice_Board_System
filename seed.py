import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from flask import Flask
from models import db, Admin, Category, Department, Notice, ActivityLog

def seed_db():
    app = Flask(__name__)
    # Set DB URI to instance folder
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize the app with db
    db.init_app(app)
    
    with app.app_context():
        # Ensure database is clean
        db.drop_all()
        db.create_all()
        populate_dummy_data()
        print("Database tables and seed data created.")

def populate_dummy_data():
    if Category.query.first():
        return # Already populated

    # 1. Seed Admin
    admin_user = Admin.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = Admin(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='Administrator'
        )
        db.session.add(admin_user)
        db.session.commit()
        
    # 2. Seed Categories
        categories = ['Exams', 'Placements', 'Sports', 'Events', 'General', 'Exam', 'Placement', 'Event']
        cat_objects = {}
        for name in categories:
            # Check if already added to avoid unique constraints violation
            if name not in cat_objects:
                cat = Category(name=name)
                db.session.add(cat)
                cat_objects[name] = cat
            
        # 3. Seed Departments
        departments = ['BCA', 'B.Sc', 'M.Sc', 'Administration', 'Academic Affairs', 'Placement Cell', 'Student Council', 'Library']
        dept_objects = {}
        for name in departments:
            if name not in dept_objects:
                dept = Department(name=name)
                db.session.add(dept)
                dept_objects[name] = dept
            
        # Commit to get PKs
        db.session.commit()
        print("Admins, Categories, and Departments seeded.")
        
        # 4. Seed Notices
        notices_data = [
            {
                'title': 'Featured Scholarship Application Open',
                'description': 'Applications are open for the Merit-Cum-Means Scholarship for the academic year 2026. Eligible students from BCA, B.Sc, and M.Sc with a CGPA above 8.5 can apply. Please submit your application with all financial proofs to the office of the administrator before the deadline.',
                'category': 'General',
                'department': 'Administration',
                'priority': 'Featured',
                'date_str': '2026-05-27',
                'days_to_expire': 15,
                'status': 'Active',
                'image_url': '/static/uploads/scholarship.png'
            },
            {
                'title': 'Urgent: Semester Examination Fee Deadline',
                'description': 'This is an urgent notification for all BCA and B.Sc students. The last date to submit the examination fee for the upcoming semester examinations is May 31, 2026. No late submissions will be accepted under any circumstances. Failure to pay will result in withholding of hall tickets.',
                'category': 'Exams',
                'department': 'Administration',
                'priority': 'Urgent',
                'date_str': '2026-05-27',
                'days_to_expire': 4,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'Campus Placement Drive by TechCorp',
                'description': 'TechCorp is conducting a pool campus recruitment drive for final year BCA and B.Sc students on June 5, 2026. Role: Associate Software Engineer. Register on the placement portal by June 1, 2026. Bring three copies of your resume and formal attire is mandatory.',
                'category': 'Placements',
                'department': 'BCA',
                'priority': 'Normal',
                'date_str': '2026-05-27',
                'days_to_expire': 9,
                'status': 'Active',
                'image_url': '/static/uploads/placement.png'
            },
            {
                'title': 'Annual College Sports Meet 2026',
                'description': 'The Annual Athletics and Sports Meet will be held on June 10 and 11, 2026, at the college ground. Registrations for track events, football, basketball, and table tennis are open. Register your names with the physical education director.',
                'category': 'Sports',
                'department': 'Administration',
                'priority': 'Normal',
                'date_str': '2026-05-27',
                'days_to_expire': 12,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'Coding Hackathon - HackTheFuture',
                'description': 'BCA Department is organizing a 24-hour national coding hackathon starting June 15, 2026. Registration fee is Rs. 500 per team of max 3 members. Attractive cash prizes to be won! Theme: Sustainable Technology.',
                'category': 'Events',
                'department': 'BCA',
                'priority': 'Normal',
                'date_str': '2026-05-27',
                'days_to_expire': 20,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'M.Sc Project Submission Guidelines',
                'description': 'All final year M.Sc students must submit their project synopsis by June 8, 2026. Please follow the format guide attached to the handbook and verify the signature of your designated internal guide before submitting.',
                'category': 'Exams',
                'department': 'M.Sc',
                'priority': 'Normal',
                'date_str': '2026-05-27',
                'days_to_expire': 10,
                'status': 'Active',
                'image_url': None
            },
            # --- User Requested Notices ---
            {
                'title': 'Final Semester Exam Time Table',
                'description': 'The final semester examinations for BCA and B.Sc will commence from April 10th. Detailed time tables are available on the student portal.',
                'category': 'Exam',
                'department': 'Academic Affairs',
                'priority': 'Urgent',
                'date_str': '2026-05-15',
                'days_to_expire': 45,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'On-Campus Placement Drive: Infosys',
                'description': 'Infosys will be visiting the campus for recruitment. Eligibility: 60% and above in 10th/12th/Degree. Register via the placement portal by March 20th.',
                'category': 'Placement',
                'department': 'Placement Cell',
                'priority': 'Urgent',
                'date_str': '2026-05-18',
                'days_to_expire': 30,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'Annual Tech Fest: "CyberScape 2024"',
                'description': 'The college is hosting its annual tech symposium. Events include Coding, Gaming, and Robotics. Registration is open for all departments.',
                'category': 'Event',
                'department': 'Student Council',
                'priority': 'Normal',
                'date_str': '2026-05-20',
                'days_to_expire': 25,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'Holiday Declaration: Holi',
                'description': 'The college will remain closed on March 25th on account of Holi. Regular classes will resume on March 26th.',
                'category': 'General',
                'department': 'Administration',
                'priority': 'Normal',
                'date_str': '2026-05-22',
                'days_to_expire': 10,
                'status': 'Active',
                'image_url': None
            },
            {
                'title': 'Library: New Arrivals',
                'description': 'New books on Data Science and Machine Learning have been added to the reference section. Students can issue them from Monday.',
                'category': 'General',
                'department': 'Library',
                'priority': 'Normal',
                'date_str': '2026-05-23',
                'days_to_expire': 15,
                'status': 'Active',
                'image_url': None
            }
        ]
        
        for n in notices_data:
            # Parse posting date, use current if fails or not provided
            post_date = datetime.utcnow()
            if 'date_str' in n:
                try:
                    post_date = datetime.strptime(n['date_str'], '%Y-%m-%d')
                except ValueError:
                    pass
            
            # Expiry calculated from post date
            expiry = post_date + timedelta(days=n['days_to_expire'])
            
            notice = Notice(
                title=n['title'],
                description=n['description'],
                category_id=cat_objects[n['category']].cat_id,
                department_id=dept_objects[n['department']].dept_id,
                priority=n['priority'],
                date=post_date,
                expiry_date=expiry,
                status=n['status'],
                image_url=n['image_url']
            )
            db.session.add(notice)
            
        # 5. Seed initial Activity Log
        log = ActivityLog(
            action="System initialized and seed data successfully uploaded.",
            admin_id=admin_user.id
        )
        db.session.add(log)
        
        db.session.commit()
        print("Sample Notices and Activity Logs seeded successfully.")

if __name__ == '__main__':
    seed_db()

