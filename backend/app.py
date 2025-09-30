from flask import Flask, jsonify, request
from flask_cors import CORS
from models import BunkManager

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:3000",
    "https://bunkit-notfawkes-projects.vercel.app"
]}})

manager = BunkManager()

@app.get("/health")
def health():
  return jsonify({"status": "ok"})

@app.get("/students")
def list_students():
  students = [s.to_dict() for s in manager.all_students()]
  return jsonify(students)

@app.post("/students")
def create_student():
  data = request.get_json(silent=True) or {}
  name = data.get("name", "").strip()
  if not name:
    return jsonify({"error": "Name is required"}), 400
  try:
    student = manager.add_student(name)
    return jsonify(student.to_dict()), 201
  except ValueError as e:
    return jsonify({"error": str(e)}), 400

@app.get("/students/<name>")
def get_student(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  return jsonify(s.to_dict())

# Aggregate (backward compatible) endpoints
@app.post("/students/<name>/present")
def mark_present(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  s.mark_attendance()
  return jsonify(s.to_dict())

@app.post("/students/<name>/absent")
def mark_absent(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  s.mark_absent()
  return jsonify(s.to_dict())

@app.get("/students/<name>/summary")
def student_summary(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  try:
    required = float(request.args.get("required", "75"))
  except ValueError:
    return jsonify({"error": "Invalid required percentage"}), 400

  summary = {
    "name": s.name,
    "total_classes": s.total_classes,
    "attended_classes": s.attended_classes,
    "percentage": s.calculate_percentage(),
    "required_percentage": required,
    "allowed_bunks": s.allowed_bunks(required),
  }
  return jsonify(summary)

# --- New: Subject management ---
@app.post("/students/<name>/subjects")
def add_subject(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  data = request.get_json(silent=True) or {}
  subject = (data.get("subject") or "").strip()
  if not subject:
    return jsonify({"error": "Subject is required"}), 400
  try:
    subj = s.add_subject(subject)
    return jsonify(subj.to_dict()), 201
  except ValueError as e:
    return jsonify({"error": str(e)}), 400

@app.get("/students/<name>/subjects")
def list_subjects(name: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  return jsonify([subj.to_dict() for subj in s.all_subjects()])

@app.post("/students/<name>/subjects/<subject>/present")
def mark_subject_present(name: str, subject: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  subj = s.mark_attendance_subject(subject)
  return jsonify(subj.to_dict())

@app.post("/students/<name>/subjects/<subject>/absent")
def mark_subject_absent(name: str, subject: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  subj = s.mark_absent_subject(subject)
  return jsonify(subj.to_dict())

@app.get("/students/<name>/subjects/<subject>/summary")
def subject_summary(name: str, subject: str):
  s = manager.get_student(name)
  if not s:
    return jsonify({"error": "Student not found"}), 404
  subj = s.get_subject(subject)
  if not subj:
    return jsonify({"error": "Subject not found"}), 404
  try:
    required = float(request.args.get("required", "75"))
  except ValueError:
    return jsonify({"error": "Invalid required percentage"}), 400

  summary = {
    "student": s.name,
    "subject": subj.name,
    "total_classes": subj.total_classes,
    "attended_classes": subj.attended_classes,
    "percentage": subj.calculate_percentage(),
    "required_percentage": required,
    "allowed_bunks": subj.allowed_bunks(required),
  }
  return jsonify(summary)

if __name__ == "__main__":
  # Simple dev server
  app.run(host="0.0.0.0", port=5000, debug=True)
