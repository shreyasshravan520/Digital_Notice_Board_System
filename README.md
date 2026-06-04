# Digital Notice Board

## Project Overview
The Digital Notice Board is a full-stack Flask application designed to replace traditional paper-based notice systems. It provides an intuitive admin dashboard for posting and managing notices, and a public-facing display for real-time updates.

## Features
- **Real-Time Notices**: View active notices instantly.
- **Admin Dashboard**: Manage notices, categories, and departments.
- **Priority Levels**: Support for Urgent and Normal priority notices.
- **Image Uploads**: Attach images to notices.
- **Expiration Dates**: Automatically expire notices after a set date.
- **Categorization**: Filter notices by category and department.

## Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/USERNAME/REPOSITORY.git
   cd Digital_Notice_Board
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Local Development Instructions
1. Initialize the database and default admin user:
   ```bash
   python seed.py
   ```
2. Run the Flask application:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to:
   [http://localhost:5000](http://localhost:5000)

## Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Render Deployment Guide
1. Go to [Render](https://render.com/) and create a "Web Service".
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Add the following Environment Variable:
   - `SECRET_KEY`: `<random-secure-secret>`

## Vercel Deployment Guide
1. Go to [Vercel](https://vercel.com/) and create a "New Project".
2. Import your GitHub repository.
3. Vercel will automatically detect the `vercel.json` and deploy your application as Serverless Functions.

## Important Notes for Production
This project currently uses:
- SQLite database (`database.db`)
- Local image uploads (`static/uploads/`)

**Limitation on Render Free Tier and Vercel**: 
Both Render's free tier and Vercel use ephemeral file systems. This means:
- Uploaded images may disappear after redeployment or when the server sleeps.
- SQLite data may reset after redeployment.

**For a robust production deployment, it is highly recommended to use:**
- A managed database like **PostgreSQL** or MySQL.
- An external image hosting service like **Cloudinary** or AWS S3.
