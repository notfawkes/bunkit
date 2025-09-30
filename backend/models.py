from __future__ import annotations
from dataclasses import dataclass, asdict, field
from typing import Dict, List

@dataclass
class SubjectAttendance:
  name: str
  total_classes: int = 0
  attended_classes: int = 0

  def mark_attendance(self) -> None:
    self.total_classes += 1
    self.attended_classes += 1

  def mark_absent(self) -> None:
    self.total_classes += 1

  def calculate_percentage(self) -> float:
    if self.total_classes == 0:
      return 0.0
    return round((self.attended_classes / self.total_classes) * 100.0, 2)

  def allowed_bunks(self, required_percentage: float) -> int:
    # Max x such that attended / (total + x) >= r
    r = max(0.0001, required_percentage)
    a = self.attended_classes
    t = self.total_classes
    numerator = (100 * a) - (r * t)
    if numerator <= 0:
      return 0
    return int(numerator // r)

  def to_dict(self):
    d = asdict(self)
    d["percentage"] = self.calculate_percentage()
    return d


@dataclass
class Student:
  name: str
  # Keep original aggregate counters for backward compatibility with existing endpoints/UI
  total_classes: int = 0
  attended_classes: int = 0
  # New: per-subject tracking
  subjects: Dict[str, SubjectAttendance] = field(default_factory=dict)

  # Existing aggregate methods (unchanged behavior)
  def mark_attendance(self) -> None:
    self.total_classes += 1
    self.attended_classes += 1

  def mark_absent(self) -> None:
    self.total_classes += 1

  def calculate_percentage(self) -> float:
    if self.total_classes == 0:
      return 0.0
    return round((self.attended_classes / self.total_classes) * 100.0, 2)

  def allowed_bunks(self, required_percentage: float) -> int:
    r = max(0.0001, required_percentage)
    a = self.attended_classes
    t = self.total_classes
    numerator = (100 * a) - (r * t)
    if numerator <= 0:
      return 0
    return int(numerator // r)

  # New: subject helpers
  def add_subject(self, subject: str) -> SubjectAttendance:
    key = subject.strip()
    if not key:
      raise ValueError("Subject name cannot be empty")
    if key in self.subjects:
      return self.subjects[key]
    s = SubjectAttendance(name=key)
    self.subjects[key] = s
    return s

  def get_subject(self, subject: str) -> SubjectAttendance | None:
    return self.subjects.get(subject)

  def all_subjects(self) -> List[SubjectAttendance]:
    return list(self.subjects.values())

  def mark_attendance_subject(self, subject: str) -> SubjectAttendance:
    s = self.add_subject(subject) if subject not in self.subjects else self.subjects[subject]
    s.mark_attendance()
    return s

  def mark_absent_subject(self, subject: str) -> SubjectAttendance:
    s = self.add_subject(subject) if subject not in self.subjects else self.subjects[subject]
    s.mark_absent()
    return s

  def to_dict(self):
    d = asdict(self)
    # enrich with calculated percentage fields
    d["percentage"] = self.calculate_percentage()
    d["subjects"] = [subj.to_dict() for subj in self.all_subjects()]
    return d


class BunkManager:
  def __init__(self):
    self._students: dict[str, Student] = {}

  def add_student(self, name: str) -> Student:
    key = name.strip()
    if not key:
      raise ValueError("Name cannot be empty")
    if key in self._students:
      return self._students[key]
    s = Student(name=key)
    self._students[key] = s
    return s

  def get_student(self, name: str) -> Student | None:
    return self._students.get(name)

  def all_students(self) -> list[Student]:
    return list(self._students.values())
