// Managed by opencode-professor.

import fs from "node:fs"
import path from "node:path"

export const STATE_VERSION = 1
export const PROGRESS_START = "<!-- professor-progress:start -->"
export const PROGRESS_END = "<!-- professor-progress:end -->"

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function resolveFrom(root, target) {
  return path.isAbsolute(target) ? target : path.join(root, target)
}

export function loadState(file) {
  let raw
  try {
    raw = fs.readFileSync(file, "utf8")
  } catch (error) {
    throw new Error(`lesson_state: cannot read ${file}: ${error}`)
  }
  try {
    const state = JSON.parse(raw)
    state.sessions ??= []
    state.nodes ??= []
    state.gaps ??= []
    state.quizHistory ??= []
    return state
  } catch (error) {
    throw new Error(`lesson_state: ${file} is not valid JSON: ${error}`)
  }
}

export function saveState(file, state) {
  state.updatedAt = new Date().toISOString()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  fs.renameSync(temp, file)
}

export function createState({ topic, goal, log, plan, sessionID }) {
  const now = new Date().toISOString()
  return {
    version: STATE_VERSION,
    topic,
    goal,
    log,
    plan,
    status: "active",
    createdAt: now,
    updatedAt: now,
    sessions: sessionID ? [sessionID] : [],
    nodes: [],
    gaps: [],
    quizHistory: [],
  }
}

export function scanLessons(root) {
  const lessons = path.join(root, "lessons")
  let entries
  try {
    entries = fs.readdirSync(lessons, { withFileTypes: true })
  } catch {
    return []
  }

  const found = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = path.join(lessons, entry.name, "state.json")
    if (!fs.existsSync(file)) continue
    try {
      found.push({ file, state: loadState(file) })
    } catch {
      // A damaged lesson must not prevent other lessons from being listed.
    }
  }
  return found.sort((a, b) => b.state.updatedAt.localeCompare(a.state.updatedAt))
}

export function findStateForSession(root, sessionID) {
  return scanLessons(root).find(({ state }) => state.sessions.includes(sessionID))?.file
}

export function attachSession(state, sessionID) {
  state.sessions ??= []
  if (!state.sessions.includes(sessionID)) state.sessions.push(sessionID)
}

export function nextNode(state) {
  return state.nodes.find(
    (node) =>
      node.status === "pending" &&
      node.deps.every((dependency) => state.nodes.find((candidate) => candidate.id === dependency)?.status !== "pending"),
  )
}

export function summarize(state) {
  const teachable = state.nodes.filter((node) => node.status !== "prior")
  const verified = teachable.filter((node) => node.status === "verified").length
  if (state.status === "complete") return `${state.topic} — complete (${verified}/${teachable.length})`
  if (teachable.length === 0) return `${state.topic} — no plan committed yet`
  const next = nextNode(state)
  const open = state.gaps.filter((gap) => gap.status === "open").length
  return `${state.topic} — ${verified}/${teachable.length} verified${next ? `, next: ${next.id}` : ""}${
    open ? `, ${open} open gap${open === 1 ? "" : "s"}` : ""
  }`
}

export function validatePlan(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("plan requires a non-empty nodes array")
  const ids = new Set()
  for (const node of nodes) {
    if (!node.id?.trim()) throw new Error("Every plan node needs an id")
    if (ids.has(node.id)) throw new Error(`Duplicate node id '${node.id}'`)
    ids.add(node.id)
  }
  for (const node of nodes) {
    for (const dependency of node.deps ?? []) {
      if (!ids.has(dependency)) throw new Error(`Node '${node.id}' depends on unknown node '${dependency}'`)
      if (dependency === node.id) throw new Error(`Node '${node.id}' cannot depend on itself`)
    }
  }

  const visiting = new Set()
  const visited = new Set()
  const byID = new Map(nodes.map((node) => [node.id, node]))
  const visit = (id) => {
    if (visiting.has(id)) throw new Error(`Plan contains a dependency cycle at '${id}'`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of byID.get(id).deps ?? []) visit(dependency)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of ids) visit(id)
}

function escapeMermaidLabel(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function renderProgressMap(state) {
  const ids = new Map(state.nodes.map((node, index) => [node.id, `n${index}`]))
  const labels = { prior: "Prior knowledge", pending: "Pending", verified: "Verified" }
  const lines = [
    PROGRESS_START,
    "## Lesson progress",
    "",
    "> Automatically maintained from `state.json`. Do not edit this block manually.",
    "",
    "```mermaid",
    "flowchart TD",
  ]

  for (const node of state.nodes) {
    lines.push(`  ${ids.get(node.id)}["${escapeMermaidLabel(node.title)}<br/>${labels[node.status]}"]:::${node.status}`)
  }
  for (const node of state.nodes) {
    for (const dependency of node.deps) {
      lines.push(`  ${ids.get(dependency)} --> ${ids.get(node.id)}`)
    }
  }
  lines.push(
    "  classDef prior fill:#dbeafe,stroke:#2563eb,color:#111827",
    "  classDef pending fill:#fef3c7,stroke:#d97706,color:#111827",
    "  classDef verified fill:#dcfce7,stroke:#16a34a,color:#111827",
    "```",
    "",
  )
  const taught = state.nodes.filter((node) => node.status !== "prior")
  const verified = taught.filter((node) => node.status === "verified").length
  const prior = state.nodes.filter((node) => node.status === "prior").length
  lines.push(
    `**Progress:** ${verified}/${taught.length} taught nodes verified · ${prior} prior · lesson ${state.status}`,
    PROGRESS_END,
  )
  return lines.join("\n")
}

export function updateProgressMap(root, state) {
  if (!state.nodes.length) return
  const targetName = state.plan || state.log
  if (!targetName) return
  const target = resolveFrom(root, targetName)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const block = renderProgressMap(state)
  const marked = /<!-- professor-progress:start -->[\s\S]*?<!-- professor-progress:end -->/
  let markdown
  if (fs.existsSync(target)) {
    markdown = fs.readFileSync(target, "utf8")
  } else {
    const heading = path.basename(target, ".md").replace(/[-_]/g, " ")
    markdown = `# ${heading}\n\n*${new Date().toISOString().slice(0, 10)}*\n`
  }
  const next = marked.test(markdown) ? markdown.replace(marked, block) : `${markdown.trimEnd()}\n\n${block}\n`
  fs.writeFileSync(target, next.endsWith("\n") ? next : `${next}\n`, "utf8")
}

function asCorrectAnswers(value) {
  return Array.isArray(value) ? value : [value]
}

function normalizedSet(values) {
  return [...new Set(values.map((value) => String(value).trim()))].sort()
}

export function validateQuizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("Quiz needs at least one question")
  const ids = new Set()
  for (const question of questions) {
    if (!question.id?.trim()) throw new Error("Every quiz question needs an id")
    if (ids.has(question.id)) throw new Error(`Duplicate quiz question id '${question.id}'`)
    ids.add(question.id)
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5) {
      throw new Error(`Question '${question.id}' needs 2-5 options`)
    }
    if (question.options.some((option) => option.trim().toLowerCase() === "i don't know")) {
      throw new Error(`Question '${question.id}' must not supply its own I don't know option`)
    }
    const correct = asCorrectAnswers(question.correctAnswer)
    if (!question.multiSelect && correct.length !== 1) {
      throw new Error(`Question '${question.id}' has several correct answers but multiSelect is false`)
    }
    if (correct.length >= question.options.length) throw new Error(`Question '${question.id}' needs at least one distractor`)
    for (const answer of correct) {
      if (question.options.filter((option) => option.trim() === String(answer).trim()).length !== 1) {
        throw new Error(`Question '${question.id}' correctAnswer must match exactly one option: ${JSON.stringify(answer)}`)
      }
    }
  }
}

export function shuffle(values, random = Math.random) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

export function prepareQuiz(questions, random = Math.random) {
  validateQuizQuestions(questions)
  const prepared = questions.map((question, index) => {
    const options = question.shuffle === false ? [...question.options] : shuffle(question.options, random)
    return {
      id: question.id,
      label: question.label || `Q${index + 1}`,
      prompt: question.prompt,
      options,
      correctAnswers: asCorrectAnswers(question.correctAnswer),
      multiSelect: question.multiSelect === true,
      explanation: question.explanation || "",
    }
  })
  const nativeQuestions = prepared.map((question) => ({
    header: question.label.slice(0, 30),
    question: question.prompt,
    options: [...question.options, "I don't know"].map((label) => ({ label, description: "" })),
    multiple: question.multiSelect,
  }))
  return { prepared, nativeQuestions }
}

export function gradeQuiz(prepared, answers) {
  return prepared.map((question, index) => {
    const selected = Array.isArray(answers?.[index]) ? answers[index].map(String) : []
    const idk = selected.includes("I don't know") || selected.length === 0
    const clean = selected.filter((answer) => answer !== "I don't know")
    const correct = !idk && JSON.stringify(normalizedSet(clean)) === JSON.stringify(normalizedSet(question.correctAnswers))
    return {
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      selected: clean,
      correctAnswers: [...question.correctAnswers],
      correct,
      idk,
      explanation: question.explanation,
    }
  })
}

export function formatGrading(results) {
  const lines = ["Professor grading (authoritative):"]
  for (const result of results) {
    const mark = result.idk ? "?" : result.correct ? "✓" : "✗"
    const selected = result.idk ? "I don't know" : result.selected.join(", ") || "Unanswered"
    lines.push(`${mark} ${result.label} (${result.id}): ${selected}`)
    if (!result.correct) lines.push(`  Correct: ${result.correctAnswers.join(", ")}`)
    if (result.explanation) lines.push(`  ${result.explanation}`)
  }
  lines.push(`Score: ${results.filter((result) => result.correct).length}/${results.length}`)
  lines.push("This grading was computed by the plugin; do not re-grade or contradict it.")
  return lines.join("\n")
}

export function applyQuizResults(file, root, results) {
  const state = loadState(file)
  const now = new Date().toISOString()
  let touched = false
  for (const result of results) {
    const node = state.nodes.find((candidate) => candidate.id === result.id)
    if (!node) continue
    node.attempts ??= []
    node.attempts.push({ at: now, correct: result.correct, idk: result.idk, selected: result.selected })
    if (result.correct && node.status === "pending") node.status = "verified"
    touched = true
  }
  state.quizHistory ??= []
  state.quizHistory.push({ at: now, results })
  saveState(file, state)
  if (touched) updateProgressMap(root, state)
  return state
}

export function addGap(state, text) {
  const gap = {
    id: `g${state.gaps.length + 1}`,
    text,
    at: new Date().toISOString(),
    status: "open",
  }
  state.gaps.push(gap)
  return gap
}

function textFromParts(parts) {
  return parts
    .filter((part) => part.type === "text" && !part.synthetic && !part.ignored)
    .map((part) => part.text)
    .join("\n")
    .trim()
}

function gradingFromParts(parts) {
  const sections = []
  for (const part of parts) {
    if (part.type !== "tool" || part.tool !== "question" || part.state?.status !== "completed") continue
    const results = part.state.metadata?.professorQuiz?.results
    if (Array.isArray(results)) sections.push(formatGrading(results))
  }
  return sections
}

export function renderTranscript(topic, createdAt, messages) {
  const lines = [`# ${topic}`, "", `*${String(createdAt).slice(0, 10)}*`, ""]
  for (const message of messages) {
    const text = textFromParts(message.parts ?? [])
    if (message.info?.role === "user" && text) {
      lines.push(text.split("\n").map((line) => `> ${line}`).join("\n"), "")
    } else if (message.info?.role === "assistant") {
      if (text) lines.push(text, "")
      for (const grading of gradingFromParts(message.parts ?? [])) {
        lines.push(`**Quiz**\n\n\`\`\`text\n${grading}\n\`\`\``, "")
      }
    }
  }
  return `${lines.join("\n").trimEnd()}\n`
}
