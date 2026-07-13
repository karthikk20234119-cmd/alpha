import os
import sqlite3
from datetime import datetime
from functools import wraps
from flask import (Flask, render_template, request, redirect, url_for,
                   session, flash, g, jsonify)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# ─── Config ────────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "alphax-super-secret-key-change-in-prod")

DATABASE    = "database.db"
UPLOAD_DIR  = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXT = {"pdf", "doc", "docx", "png", "jpg", "jpeg", "zip", "txt"}
MAX_MB      = 10
app.config["MAX_CONTENT_LENGTH"] = MAX_MB * 1024 * 1024

ADMIN_USER = "admin"
ADMIN_HASH = generate_password_hash("alphax2024")   # change password here

PROJECTS_PER_PAGE = 8

os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─── Database ───────────────────────────────────────────────────────────────────
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            email       TEXT    NOT NULL,
            phone       TEXT    NOT NULL,
            project_type TEXT   NOT NULL,
            description TEXT    NOT NULL,
            budget      TEXT,
            deadline    TEXT,
            file_path   TEXT,
            status      TEXT    DEFAULT 'Pending',
            created_at  TEXT    DEFAULT (datetime('now'))
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS contact_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            email       TEXT    NOT NULL,
            phone       TEXT,
            subject     TEXT,
            message     TEXT    NOT NULL,
            created_at  TEXT    DEFAULT (datetime('now'))
        )
    """)
    db.commit()
    db.close()


# ─── Helpers ────────────────────────────────────────────────────────────────────
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            flash("Please log in to access the admin panel.", "error")
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


# ─── Public Routes ──────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/contact", methods=["POST"])
def contact():
    name    = request.form.get("name", "").strip()
    email   = request.form.get("email", "").strip()
    phone   = request.form.get("phone", "").strip()
    subject = request.form.get("subject", "").strip()
    message = request.form.get("message", "").strip()

    if not name or not email or not message:
        return jsonify({"success": False, "message": "Please fill in all required fields."}), 400

    db = get_db()
    db.execute("""
        INSERT INTO contact_messages (name, email, phone, subject, message)
        VALUES (?, ?, ?, ?, ?)
    """, (name, email, phone, subject, message))
    db.commit()

    return jsonify({"success": True, "message": "Message sent successfully! We'll get back to you within 24 hours."})

@app.route("/submit", methods=["GET", "POST"])
def submit():
    if request.method == "POST":
        name         = request.form.get("name", "").strip()
        email        = request.form.get("email", "").strip()
        phone        = request.form.get("phone", "").strip()
        project_type = request.form.get("project_type", "").strip()
        description  = request.form.get("description", "").strip()
        budget       = request.form.get("budget", "").strip()
        deadline     = request.form.get("deadline", "").strip()

        # Validation
        errors = []
        if not name:        errors.append("Full name is required.")
        if not email:       errors.append("Email is required.")
        if not phone:       errors.append("Phone number is required.")
        if not project_type: errors.append("Project type is required.")
        if not description: errors.append("Project description is required.")

        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("submit.html", form=request.form)

        # File upload
        file_path = None
        file = request.files.get("file")
        if file and file.filename:
            if not allowed_file(file.filename):
                flash(f"File type not allowed. Allowed: {', '.join(ALLOWED_EXT)}", "error")
                return render_template("submit.html", form=request.form)
            filename  = secure_filename(file.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_")
            filename  = timestamp + filename
            file_path = filename
            file.save(os.path.join(UPLOAD_DIR, filename))

        db = get_db()
        db.execute("""
            INSERT INTO projects (name, email, phone, project_type, description, budget, deadline, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, email, phone, project_type, description, budget, deadline, file_path))
        db.commit()

        flash("🚀 Project submitted successfully! We'll be in touch soon.", "success")
        return redirect(url_for("submit"))

    return render_template("submit.html", form={})


# ─── Admin Routes ───────────────────────────────────────────────────────────────
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if username == ADMIN_USER and check_password_hash(ADMIN_HASH, password):
            session["admin_logged_in"] = True
            flash("Welcome back, Admin!", "success")
            return redirect(url_for("admin_dashboard"))
        flash("Invalid credentials. Try again.", "error")

    return render_template("admin_login.html")

@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    flash("Logged out successfully.", "success")
    return redirect(url_for("admin_login"))

@app.route("/admin")
@app.route("/admin/dashboard")
@login_required
def admin_dashboard():
    page    = request.args.get("page", 1, type=int)
    status  = request.args.get("status", "")
    search  = request.args.get("search", "").strip()
    db      = get_db()

    query  = "SELECT * FROM projects WHERE 1=1"
    params = []
    if status:
        query  += " AND status = ?"
        params.append(status)
    if search:
        query  += " AND (name LIKE ? OR email LIKE ? OR project_type LIKE ?)"
        params += [f"%{search}%", f"%{search}%", f"%{search}%"]

    total = db.execute(f"SELECT COUNT(*) FROM ({query})", params).fetchone()[0]
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params += [PROJECTS_PER_PAGE, (page - 1) * PROJECTS_PER_PAGE]

    projects    = db.execute(query, params).fetchall()
    total_pages = (total + PROJECTS_PER_PAGE - 1) // PROJECTS_PER_PAGE

    stats = {
        "total":      db.execute("SELECT COUNT(*) FROM projects").fetchone()[0],
        "pending":    db.execute("SELECT COUNT(*) FROM projects WHERE status='Pending'").fetchone()[0],
        "inprogress": db.execute("SELECT COUNT(*) FROM projects WHERE status='In Progress'").fetchone()[0],
        "completed":  db.execute("SELECT COUNT(*) FROM projects WHERE status='Completed'").fetchone()[0],
    }

    if request.args.get("format") == "json" or request.headers.get("Accept") == "application/json":
        return jsonify({
            "projects": [dict(p) for p in projects],
            "stats": stats,
            "page": page,
            "total_pages": total_pages,
            "total_count": total
        })

    return render_template("admin_dashboard.html",
                           projects=projects, stats=stats,
                           page=page, total_pages=total_pages,
                           status=status, search=search)

@app.route("/admin/project/<int:pid>")
@login_required
def admin_project(pid):
    db      = get_db()
    project = db.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not project:
        flash("Project not found.", "error")
        return redirect(url_for("admin_dashboard"))
    return render_template("admin_project.html", project=project)

@app.route("/admin/project/<int:pid>/status", methods=["POST"])
@login_required
def update_status(pid):
    new_status = request.form.get("status")
    if new_status not in ("Pending", "In Progress", "Completed"):
        flash("Invalid status.", "error")
        return redirect(url_for("admin_project", pid=pid))
    db = get_db()
    db.execute("UPDATE projects SET status=? WHERE id=?", (new_status, pid))
    db.commit()
    flash(f"Status updated to '{new_status}'.", "success")
    return redirect(url_for("admin_project", pid=pid))

@app.route("/admin/project/<int:pid>/delete", methods=["POST"])
@login_required
def delete_project(pid):
    db = get_db()
    project = db.execute("SELECT file_path FROM projects WHERE id=?", (pid,)).fetchone()
    if project and project["file_path"]:
        fp = os.path.join(UPLOAD_DIR, project["file_path"])
        if os.path.exists(fp):
            os.remove(fp)
    db.execute("DELETE FROM projects WHERE id=?", (pid,))
    db.commit()
    flash("Project deleted.", "success")
    return redirect(url_for("admin_dashboard"))


# ─── Entry ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
