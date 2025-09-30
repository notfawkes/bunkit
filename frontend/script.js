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
  required: 75, // default required percentage
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
    // keep selection if present
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

    const badge = document.createElement("span")
    badge.className = "badge"
    badge.textContent = `${s.percentage}%`

    left.appendChild(name)
    li.appendChild(left)
    right.appendChild(badge)
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
    el.details.innerHTML = "<p>Select a student to view stats.</p>"
    return
  }

  const s = state.students.find((x) => x.name === state.current)
  if (!s) {
    el.details.innerHTML = "<p>Student not found. Refresh the list.</p>"
    return
  }

  el.details.innerHTML = ""

  const header = document.createElement("div")
  header.className = "row"
  const title = document.createElement("h3")
  title.textContent = s.name
  header.appendChild(title)

  const stats = document.createElement("div")
  stats.className = "stats"
  stats.appendChild(statBlock("Total Classes", s.total_classes))
  stats.appendChild(statBlock("Attended", s.attended_classes))
  stats.appendChild(statBlock("Absent", s.total_classes - s.attended_classes))
  stats.appendChild(statBlock("Percentage", `${s.percentage}%`))

  const actions = document.createElement("div")
  actions.className = "row"
  const presentBtn = document.createElement("button")
  presentBtn.className = "btn success"
  presentBtn.textContent = "Mark Present"
  presentBtn.addEventListener("click", () => markPresent(s.name))

  const absentBtn = document.createElement("button")
  absentBtn.className = "btn danger"
  absentBtn.textContent = "Mark Absent"
  absentBtn.addEventListener("click", () => markAbsent(s.name))

  actions.appendChild(presentBtn)
  actions.appendChild(absentBtn)

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
    updateSummary(s.name, summaryEl)
  })

  reqRow.appendChild(reqLabel)
  reqRow.appendChild(reqInput)

  const summaryEl = document.createElement("div")
  summaryEl.className = "stat"
  summaryEl.innerHTML = `
    <label>Allowed Bunks</label>
    <div class="value">—</div>
  `

  el.details.appendChild(header)
  el.details.appendChild(stats)
  el.details.appendChild(actions)
  el.details.appendChild(reqRow)
  el.details.appendChild(summaryEl)

  updateSummary(s.name, summaryEl)
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

async function updateSummary(name, container) {
  try {
    const data = await api(`/students/${encodeURIComponent(name)}/summary?required=${state.required}`)
    const valEl = container.querySelector(".value")
    valEl.textContent = String(data.allowed_bunks)
  } catch (e) {
    console.error("[BunkIt] Failed to load summary:", e)
  }
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

async function markPresent(name) {
  try {
    await api(`/students/${encodeURIComponent(name)}/present`, { method: "POST" })
    await refreshStudents()
    state.current = name
    renderDetails()
  } catch (e) {
    alert(e.message)
  }
}

async function markAbsent(name) {
  try {
    await api(`/students/${encodeURIComponent(name)}/absent`, { method: "POST" })
    await refreshStudents()
    state.current = name
    renderDetails()
  } catch (e) {
    alert(e.message)
  }
}
