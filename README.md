# AlphaX Heros — Full Stack Project Management System

## Quick Start

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the application
```bash
python app.py
```

The app auto-initializes the SQLite database on first run.

Open: http://localhost:5000

---

## Default Admin Credentials

| Field    | Value        |
|----------|-------------|
| Username | `admin`      |
| Password | `alphax2024` |

**Change the password in `app.py` line:**
```python
ADMIN_HASH = generate_password_hash("your-new-password")
```

---

## Pages

| URL                   | Description              |
|-----------------------|--------------------------|
| `/`                   | Home page (public)       |
| `/submit`             | Submit project form      |
| `/admin/login`        | Admin login              |
| `/admin/dashboard`    | All projects table       |
| `/admin/project/<id>` | Project detail view      |
| `/admin/logout`       | Logout                   |

---

## Folder Structure

```
alphax/
├── app.py               # Main Flask app
├── requirements.txt
├── database.db          # Auto-created on first run
├── uploads/             # Uploaded files stored here
└── templates/
    ├── base.html         # Shared layout
    ├── index.html        # Home page
    ├── submit.html       # Project form
    ├── admin_login.html  # Admin login
    ├── admin_dashboard.html
    └── admin_project.html
```

---

## Security Notes

- Change `SECRET_KEY` in production (use env var)
- Change admin password before deploying
- File uploads limited to 10MB
- Only allowed: pdf, doc, docx, png, jpg, jpeg, zip, txt
- Admin routes protected by session middleware
- Passwords hashed with Werkzeug's `generate_password_hash`

---

## Production Deployment (Optional)

```bash
pip install gunicorn
gunicorn -w 4 app:app
```

Set environment variable:
```bash
export SECRET_KEY="your-very-secret-key-here"
```
