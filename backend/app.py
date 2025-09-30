from flask import Flask, jsonify, request
from flask_cors import CORS
from models import BunkManager

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

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

if __name__ == "__main__":
  # Simple dev server
  app.run(host="0.0.0.0", port=5000, debug=True)
