const API_BASE = "http://localhost:5000"

const el = {
  year: null,
  form: null,
  nameInput: null,
  list: null,
  details: null,
}

const state = {
  students: [],
  current: null, // student name
  required: 75, // default required percentage for summaries
}

document.addEventListener("DOMContentLoaded", () => {
  el.year = document.getElementById("year")
  el.form = document.getElementById("add-student-form")
  el.nameInput = document.getElementById("student-name")
  el.list = document.getElementById("students-list")
  el.details = document.getElementById("details")

  el.year.textContent = new Date().getFullYear()

  el.form.addEventListener("submit", onAddStudent)

  refreshStudents()
})

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

async function refreshStudents() {
  try {
    const students = await api("/students")
    state.students = students
    renderStudents()
    if (state.current && !students.find((s) => s.name === state.current)) {
      state.current = null
    }
    renderDetails()
  } catch (e) {
    console.error("[BunkIt] Failed to fetch students:", e)
  }
}

function renderStudents() {
  el.list.innerHTML = ""
  if (!state.students.length) {
    const li = document.createElement("li")
    li.className = "hint"
    li.textContent = "No students yet. Add one above."
    el.list.appendChild(li)
    return
  }

  for (const s of state.students) {
    const li = document.createElement("li")
    li.className = "list-item"
    const left = document.createElement("div")
    const right = document.createElement("div")

    const name = document.createElement("span")
    name.className = "name"
    name.textContent = s.name

    left.appendChild(name)
    li.appendChild(left)
    li.appendChild(right)

    li.tabIndex = 0
    li.setAttribute("role", "button")
    li.setAttribute("aria-label", `Select ${s.name}`)
    li.addEventListener("click", () => {
      state.current = s.name
      renderDetails()
    })
    li.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        state.current = s.name
        renderDetails()
      }
    })

    el.list.appendChild(li)
  }
}

function renderDetails() {
  if (!state.current) {
    el.details.innerHTML = "<p>Select a student to view subjects.</p>"
    return
  }

  const s = state.students.find((x) => x.name === state.current)
  if (!s) {
    el.details.innerHTML = "<p>Student not found. Refresh the list.</p>"
    return
  }

  el.details.innerHTML = ""

  // Header
  const header = document.createElement("div")
  header.className = "row"
  const title = document.createElement("h3")
  title.textContent = s.name
  header.appendChild(title)

  // Required% control (applies to per-subject allowed bunks)
  const reqRow = document.createElement("div")
  reqRow.className = "row"
  const reqLabel = document.createElement("label")
  reqLabel.textContent = "Required %:"
  reqLabel.setAttribute("for", "required-input")

  const reqInput = document.createElement("input")
  reqInput.type = "number"
  reqInput.id = "required-input"
  reqInput.min = "1"
  reqInput.max = "100"
  reqInput.step = "1"
  reqInput.value = String(state.required)
  reqInput.addEventListener("input", () => {
    const v = Number(reqInput.value || "0")
    state.required = isNaN(v) ? 75 : Math.max(1, Math.min(100, v))
    reqInput.value = String(state.required)
    updateSubjectSummaries(s.name)
  })

  reqRow.appendChild(reqLabel)
  reqRow.appendChild(reqInput)

  // Subject management UI
  const subjectCard = document.createElement("div")
  subjectCard.className = "card"
  const subjectTitle = document.createElement("h2")
  subjectTitle.textContent = "Subjects"
  const addRow = document.createElement("div")
  addRow.className = "form-row"
  const subjInput = document.createElement("input")
  subjInput.type = "text"
  subjInput.placeholder = "Add subject (e.g., Math)"
  subjInput.ariaLabel = "Subject name"
  const addBtn = document.createElement("button")
  addBtn.className = "btn"
  addBtn.textContent = "Add Subject"
  addBtn.addEventListener("click", async () => {
    const subject = (subjInput.value || "").trim()
    if (!subject) return
    try {
      await addSubject(s.name, subject)
      subjInput.value = ""
      await renderSubjects(s.name, subjectsContainer)
    } catch (e) {
      alert(e.message)
    }
  })
  addRow.appendChild(subjInput)
  addRow.appendChild(addBtn)

  const subjectsContainer = document.createElement("div")
  subjectsContainer.className = "subjects"
  subjectCard.appendChild(subjectTitle)
  subjectCard.appendChild(addRow)
  subjectCard.appendChild(subjectsContainer)

  // Append to details
  el.details.appendChild(header)
  el.details.appendChild(reqRow)
  el.details.appendChild(subjectCard)

  // Load per-subject UI
  renderSubjects(s.name, subjectsContainer)
}

// --- Subjects API helpers ---
async function addSubject(studentName, subject) {
  return api(`/students/${encodeURIComponent(studentName)}/subjects`, {
    method: "POST",
    body: JSON.stringify({ subject }),
  })
}

async function getSubjects(studentName) {
  return api(`/students/${encodeURIComponent(studentName)}/subjects`)
}

async function markSubjectPresent(studentName, subject) {
  return api(`/students/${encodeURIComponent(studentName)}/subjects/${encodeURIComponent(subject)}/present`, {
    method: "POST",
  })
}

async function markSubjectAbsent(studentName, subject) {
  return api(`/students/${encodeURIComponent(studentName)}/subjects/${encodeURIComponent(subject)}/absent`, {
    method: "POST",
  })
}

async function getSubjectSummary(studentName, subject) {
  return api(
    `/students/${encodeURIComponent(studentName)}/subjects/${encodeURIComponent(subject)}/summary?required=${state.required}`,
  )
}

// Render subjects UI
async function renderSubjects(studentName, container) {
  container.innerHTML = ""
  let subjects = []
  try {
    subjects = await getSubjects(studentName)
  } catch (e) {
    console.error("[BunkIt] Failed to load subjects:", e)
    const p = document.createElement("p")
    p.className = "hint"
    p.textContent = "Failed to load subjects."
    container.appendChild(p)
    return
  }

  if (!subjects.length) {
    const p = document.createElement("p")
    p.className = "hint"
    p.textContent = "No subjects yet. Add one above."
    container.appendChild(p)
    return
  }

  for (const subj of subjects) {
    const item = document.createElement("div")
    item.className = "subject-item"

    const header = document.createElement("div")
    header.className = "header"

    const nameEl = document.createElement("div")
    nameEl.className = "name"
    nameEl.textContent = subj.name

    const right = document.createElement("div")
    right.className = "right"
    const donut = document.createElement("canvas")
    donut.className = "donut-canvas"
    donut.setAttribute("aria-label", `${subj.name} attendance donut showing ${subj.percentage}%`)
    drawDonut(donut, subj.percentage)
    const pct = document.createElement("div")
    pct.className = "pct"
    pct.textContent = `${subj.percentage}%`

    right.appendChild(donut)
    right.appendChild(pct)

    header.appendChild(nameEl)
    header.appendChild(right)

    const summary = document.createElement("div")
    summary.className = "summary"
    summary.appendChild(statBlock("Total", subj.total_classes))
    summary.appendChild(statBlock("Attended", subj.attended_classes))
    summary.appendChild(statBlock("Absent", subj.total_classes - subj.attended_classes))
    const allowed = document.createElement("div")
    allowed.className = "stat"
    allowed.innerHTML = `<label>Allowed Bunks</label><div class="value">—</div>`
    summary.appendChild(allowed)

    const actions = document.createElement("div")
    actions.className = "actions"
    const pBtn = document.createElement("button")
    pBtn.className = "btn success"
    pBtn.textContent = "Present"
    pBtn.addEventListener("click", async () => {
      try {
        await markSubjectPresent(studentName, subj.name)
        await renderSubjects(studentName, container)
        await refreshStudents()
        state.current = studentName
      } catch (e) {
        alert(e.message)
      }
    })
    const aBtn = document.createElement("button")
    aBtn.className = "btn danger"
    aBtn.textContent = "Absent"
    aBtn.addEventListener("click", async () => {
      try {
        await markSubjectAbsent(studentName, subj.name)
        await renderSubjects(studentName, container)
        await refreshStudents()
        state.current = studentName
      } catch (e) {
        alert(e.message)
      }
    })

    actions.appendChild(pBtn)
    actions.appendChild(aBtn)

    item.appendChild(header)
    item.appendChild(summary)
    item.appendChild(actions)

    container.appendChild(item)

    // Load per-subject allowed bunks
    updateSubjectAllowed(studentName, subj.name, allowed)
  }
}

function drawDonut(canvas, percentage) {
  const pct = Math.max(0, Math.min(100, Number(percentage) || 0))
  const dpr = window.devicePixelRatio || 1
  const cssSize = { w: 48, h: 48 }
  canvas.width = cssSize.w * dpr
  canvas.height = cssSize.h * dpr
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)

  const cx = cssSize.w / 2
  const cy = cssSize.h / 2
  const radius = 20
  const thickness = 8
  const start = -Math.PI / 2
  const end = start + (2 * Math.PI * pct) / 100

  // track
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = "#253346"
  ctx.lineWidth = thickness
  ctx.lineCap = "round"
  ctx.stroke()

  // progress
  ctx.beginPath()
  ctx.arc(cx, cy, radius, start, end)
  ctx.strokeStyle = "#2ea7ff"
  ctx.lineWidth = thickness
  ctx.lineCap = "round"
  ctx.stroke()
}

function statBlock(label, value) {
  const d = document.createElement("div")
  d.className = "stat"
  const l = document.createElement("label")
  l.textContent = label
  const v = document.createElement("div")
  v.className = "value"
  v.textContent = String(value)
  d.appendChild(l)
  d.appendChild(v)
  return d
}

async function onAddStudent(ev) {
  ev.preventDefault()
  const name = el.nameInput.value.trim()
  if (!name) return
  try {
    await api("/students", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    el.nameInput.value = ""
    await refreshStudents()
  } catch (e) {
    alert(e.message)
  }
}

async function updateSubjectAllowed(studentName, subject, allowedContainer) {
  try {
    const data = await getSubjectSummary(studentName, subject)
    const valEl = allowedContainer.querySelector(".value")
    valEl.textContent = String(data.allowed_bunks)
  } catch (e) {
    console.error("[BunkIt] Failed to load subject summary:", e)
  }
}

async function updateSubjectSummaries(studentName) {
  // Re-render subjects to refresh allowed bunks values under new required%
  const container = el.details.querySelector(".subjects")
  if (container) {
    await renderSubjects(studentName, container)
  }
}
