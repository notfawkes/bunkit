"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"

type Subject = {
  name: string
  totalClasses: number
  attended: number
}

type Student = {
  name: string
  subjects: Subject[]
}

function calcPercentage(attended: number, total: number) {
  if (total <= 0) return 0
  return Math.round((attended / total) * 100)
}

// Allowed bunks x s.t. attended / (total + x) >= r
// x <= floor(attended / r - total) ; r in [0,1]
function allowedBunks(attended: number, total: number, requiredPct: number) {
  const r = Math.max(0, Math.min(100, requiredPct)) / 100
  if (r <= 0) return Number.POSITIVE_INFINITY // no requirement
  if (total <= 0) {
    // If no classes yet, we can skip until 0/(0+x) >= r => only x=0 works; be lenient = 0
    return 0
  }
  const raw = Math.floor(attended / r - total)
  return Math.max(0, isFinite(raw) ? raw : 0)
}

export default function Page() {
  // Local in-memory state to keep things simple and subject-only.
  const [students, setStudents] = useState<Student[]>([])
  const [activeStudentName, setActiveStudentName] = useState<string>("")
  const [newStudentName, setNewStudentName] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [requiredPct, setRequiredPct] = useState<number>(75)

  const activeStudent = useMemo(
    () => students.find((s) => s.name === activeStudentName) || null,
    [students, activeStudentName],
  )

  const addStudent = () => {
    const name = newStudentName.trim()
    if (!name) return
    if (students.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    const updated = [...students, { name, subjects: [] }]
    setStudents(updated)
    setActiveStudentName(name)
    setNewStudentName("")
  }

  const addSubject = () => {
    if (!activeStudent) return
    const name = newSubjectName.trim()
    if (!name) return
    if (activeStudent.subjects.some((subj) => subj.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    const updatedStudents = students.map((s) =>
      s.name === activeStudent.name ? { ...s, subjects: [...s.subjects, { name, attended: 0, totalClasses: 0 }] } : s,
    )
    setStudents(updatedStudents)
    setNewSubjectName("")
  }

  const markPresent = (subjectName: string) => {
    if (!activeStudent) return
    const updatedStudents = students.map((s) => {
      if (s.name !== activeStudent.name) return s
      return {
        ...s,
        subjects: s.subjects.map((subj) =>
          subj.name === subjectName
            ? { ...subj, attended: subj.attended + 1, totalClasses: subj.totalClasses + 1 }
            : subj,
        ),
      }
    })
    setStudents(updatedStudents)
  }

  const markAbsent = (subjectName: string) => {
    if (!activeStudent) return
    const updatedStudents = students.map((s) => {
      if (s.name !== activeStudent.name) return s
      return {
        ...s,
        subjects: s.subjects.map((subj) =>
          subj.name === subjectName ? { ...subj, totalClasses: subj.totalClasses + 1 } : subj,
        ),
      }
    })
    setStudents(updatedStudents)
  }

  const removeSubject = (subjectName: string) => {
    if (!activeStudent) return
    const updatedStudents = students.map((s) => {
      if (s.name !== activeStudent.name) return s
      return {
        ...s,
        subjects: s.subjects.filter((subj) => subj.name !== subjectName),
      }
    })
    setStudents(updatedStudents)
  }

  const COLORS = ["var(--color-attended)", "var(--color-missed)"]

  return (
    <main className="container mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-pretty">Bunk Management – Subject-wise Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Track each subject visually. Overall attendance is hidden by design.
        </p>
      </header>

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="subjects" disabled={!activeStudent}>
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>Add and select a student to manage subjects.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
                <div className="w-full md:w-72">
                  <Label htmlFor="student-name">New student name</Label>
                  <Input
                    id="student-name"
                    placeholder="e.g., Alex"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                </div>
                <Button onClick={addStudent}>Add Student</Button>
              </div>

              <Separator />

              <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                <div className="w-full md:w-72">
                  <Label htmlFor="student-select">Select student</Label>
                  <select
                    id="student-select"
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={activeStudentName}
                    onChange={(e) => setActiveStudentName(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a student…
                    </option>
                    {students.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <Label htmlFor="required-pct">Required %</Label>
                  <Input
                    id="required-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={requiredPct}
                    onChange={(e) => setRequiredPct(Number.parseInt(e.target.value || "0", 10))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
                <CardDescription>Add subjects for the selected student.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
                  <div className="w-full md:w-72">
                    <Label htmlFor="subject-name">New subject</Label>
                    <Input
                      id="subject-name"
                      placeholder="e.g., Mathematics"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      disabled={!activeStudent}
                    />
                  </div>
                  <Button onClick={addSubject} disabled={!activeStudent}>
                    Add Subject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="mt-4">
          {activeStudent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeStudent.subjects.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No subjects yet</CardTitle>
                    <CardDescription>Add subjects in the Manage tab.</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                activeStudent.subjects.map((subj) => {
                  const pct = calcPercentage(subj.attended, subj.totalClasses)
                  const canBunk = allowedBunks(subj.attended, subj.totalClasses, requiredPct)
                  const missed = Math.max(0, subj.totalClasses - subj.attended)

                  const data = [
                    { name: "Attended", value: subj.attended, key: "attended" },
                    { name: "Missed", value: missed, key: "missed" },
                  ]

                  return (
                    <Card key={subj.name} className="flex flex-col">
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-balance">{subj.name}</CardTitle>
                        <CardDescription>
                          {subj.attended}/{subj.totalClasses} classes • {pct}%
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-4">
                        <ChartContainer
                          className="h-64"
                          config={{
                            attended: {
                              label: "Attended",
                              color: "hsl(var(--chart-1))",
                            },
                            missed: {
                              label: "Missed",
                              color: "hsl(var(--chart-2))",
                            },
                          }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={70}
                                outerRadius={100}
                                strokeWidth={2}
                                paddingAngle={1}
                              >
                                {data.map((entry, index) => (
                                  <Cell
                                    key={entry.key}
                                    fill={index === 0 ? "var(--color-attended)" : "var(--color-missed)"}
                                  />
                                ))}
                              </Pie>
                              {/* Center label */}
                              <text
                                x={"50%"}
                                y={"50%"}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-foreground"
                                fontSize="20"
                                fontWeight={600}
                              >
                                {pct}%
                              </text>
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>

                        <div className="flex items-center gap-2">
                          <Button variant="default" onClick={() => markPresent(subj.name)}>
                            Mark Present
                          </Button>
                          <Button variant="secondary" onClick={() => markAbsent(subj.name)}>
                            Mark Absent
                          </Button>
                          <Button variant="destructive" onClick={() => removeSubject(subj.name)}>
                            Remove
                          </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Allowed bunks at {requiredPct}%:{" "}
                          <span className="font-medium text-foreground">
                            {Number.isFinite(canBunk) ? canBunk : "∞"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a student</CardTitle>
                <CardDescription>Use the Manage tab to choose a student.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Color variables bound by ChartContainer */}
      <style jsx global>{`
        :root {
          --color-attended: hsl(var(--chart-1));
          --color-missed: hsl(var(--chart-2));
        }
      `}</style>
    </main>
  )
}
