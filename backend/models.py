from __future__ import annotations
from dataclasses import dataclass, asdict

@dataclass
class Student:
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
    # => x <= (100a - r*t) / r
    r = max(0.0001, required_percentage)  # avoid division by zero
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
