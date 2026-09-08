// Managed by opencode-professor.

import { tool } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  addGap,
  applyQuizResults,
  attachSession,
  createState,
  findStateForSession,
  formatGrading,
  gradeQuiz,
  loadState,
  prepareQuiz,
  renderTranscript,
  resolveFrom,
  saveState,
  scanLessons,
  slugify,
  summarize,
  updateProgressMap,
  validatePlan,
} from "../lib/professor-core.js"

const statuses = ["prior", "pending", "verified"]
const actions = ["open", "plan", "mark", "gap", "status", "list", "complete"]
const quizBySession = new Map()
const activeBySession = new Map()
const logBySession = new Map()
const svgBySession = new Map()

function currentLesson(context) {
  const cached = activeBySession.get(context.sessionID)
  if (cached && fs.existsSync(cached.file)) return cached
  const file = findStateForSession(context.directory, context.sessionID)
  if (!file) return undefined
  const lesson = { file, root: context.directory }
  activeBySession.set(context.sessionID, lesson)
  return lesson
}

function requireLesson(context) {
  const lesson = currentLesson(context)
  if (!lesson) throw new Error("No lesson open in this session. Call lesson_state with action 'open' first.")
  return lesson
}

function relativeToProject(root, file) {
  return path.relative(root, file) || path.basename(file)
}

function defaultPlanPath(root, stateFile) {
  return relativeToProject(root, path.join(path.dirname(stateFile), "learning-plan.md"))
}

function ensureMarkdown(file, title) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# ${title}\n\n*${new Date().toISOString().slice(0, 10)}*\n`, "utf8")
    return true
  }
  return false
}

function quizMatchesNative(staged, args) {
  const actual = args?.questions
  if (!Array.isArray(actual) || actual.length !== staged.nativeQuestions.length) return false
  return staged.nativeQuestions.every((question, index) => question.question === actual[index]?.question)
}

function run(command, args, cwd, timeout = 60_000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeout)
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()))
    child.on("error", (error) => {
      clearTimeout(timer)
      resolve({ code: null, stdout, stderr: `${stderr}${error}`, timedOut })
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

function svgSourcePath(sessionID) {
  let file = svgBySession.get(sessionID)
  if (!file) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-professor-svg-"))
    file = path.join(directory, "diagram.svg")
    svgBySession.set(sessionID, file)
  }
  return file
}

async function renderSvg(source, output) {
  let result = await run("rsvg-convert", ["-z", "2", source, "-o", output], path.dirname(source))
  if (result.code === 0 && fs.existsSync(output)) return result
  for (const command of ["magick", "convert"]) {
    result = await run(command, ["-density", "192", "-background", "white", source, output], path.dirname(source))
    if (result.code === 0 && fs.existsSync(output)) return result
  }
  return result
}

function applyExactEdit(source, oldText, newText) {
  if (!oldText) throw new Error("old_text must not be empty")
  const first = source.indexOf(oldText)
  if (first === -1) throw new Error("old_text was not found in the SVG source")
  if (source.indexOf(oldText, first + oldText.length) !== -1) {
    throw new Error("old_text occurs more than once; include more surrounding context")
  }
  return source.slice(0, first) + newText + source.slice(first + oldText.length)
}

export default async function ProfessorPlugin({ client, directory }) {
  async function syncTranscript(sessionID) {
    let lesson = activeBySession.get(sessionID)
    if (!lesson) {
      const file = findStateForSession(directory, sessionID)
      if (!file) return
      lesson = { file, root: directory }
      activeBySession.set(sessionID, lesson)
    }
    const state = loadState(lesson.file)
    const configured = logBySession.get(sessionID)?.file || (state.log ? resolveFrom(lesson.root, state.log) : undefined)
    if (!configured) return
    const response = await client.session.messages({
      path: { id: sessionID },
      query: { directory: lesson.root },
    })
    if (!Array.isArray(response.data)) return
    fs.mkdirSync(path.dirname(configured), { recursive: true })
    fs.writeFileSync(configured, renderTranscript(state.topic, state.createdAt, response.data), "utf8")
  }

  const professorQuiz = tool({
    description:
      "Stage a mechanically graded Professor quiz. After this tool returns, immediately call OpenCode's native question tool once with the exact payload returned here. The plugin grades that answer, shows explanations, and updates matching lesson nodes. Never grade it yourself.",
    args: {
      questions: tool.schema.array(
        tool.schema.object({
          id: tool.schema.string().describe("Unique concept id; use the lesson node id when verifying a node"),
          label: tool.schema.string().optional().describe("Short display label"),
          prompt: tool.schema.string().describe("Question text"),
          options: tool.schema.array(tool.schema.string()).min(2).max(5),
          correctAnswer: tool.schema.union([tool.schema.string(), tool.schema.array(tool.schema.string())]),
          multiSelect: tool.schema.boolean().optional(),
          explanation: tool.schema.string().describe("Why the answer is correct and what the tempting distractor misses"),
          shuffle: tool.schema.boolean().optional(),
        }),
      ),
    },
    async execute(args, context) {
      const staged = prepareQuiz(args.questions)
      quizBySession.set(context.sessionID, { ...staged, root: context.directory })
      context.metadata({ title: `Professor quiz: ${staged.prepared.length} question${staged.prepared.length === 1 ? "" : "s"}` })
      return {
        title: "Professor quiz staged",
        output: [
          "QUIZ STAGED. Immediately call the native `question` tool exactly once with the JSON below.",
          "Do not answer, reword, reorder, add, or remove anything. The plugin will grade the learner's selection.",
          "```json",
          JSON.stringify({ questions: staged.nativeQuestions }, null, 2),
          "```",
        ].join("\n"),
        metadata: { questionCount: staged.prepared.length },
      }
    },
  })

  const lessonState = tool({
    description:
      "Durable Professor lesson progress. Open or resume a lesson, commit its concept DAG, record gaps, inspect status, or complete it. Correct professor_quiz answers automatically verify nodes whose ids match question ids.",
    args: {
      action: tool.schema.enum(actions),
      topic: tool.schema.string().optional(),
      goal: tool.schema.string().optional(),
      log: tool.schema.string().optional(),
      plan: tool.schema.string().optional().describe("Human-facing plan path; defaults to lessons/<topic-slug>/learning-plan.md"),
      path: tool.schema.string().optional(),
      nodes: tool.schema
        .array(
          tool.schema.object({
            id: tool.schema.string(),
            title: tool.schema.string(),
            deps: tool.schema.array(tool.schema.string()).optional(),
            status: tool.schema.enum(statuses).optional(),
          }),
        )
        .optional(),
      node: tool.schema.string().optional(),
      text: tool.schema.string().optional(),
      gap: tool.schema.string().optional(),
      nodeStatus: tool.schema.enum(statuses).optional(),
    },
    async execute(args, context) {
      if (args.action === "list") {
        const found = scanLessons(context.directory)
        if (!found.length) return "No lesson state files under lessons/."
        return `${found
          .map(({ file, state }) => `${file}\n  ${summarize(state)} [${state.status}] updated ${state.updatedAt}`)
          .join("\n")}\nResume one with action 'open' and its path.`
      }

      if (args.action === "open") {
        let file
        if (args.path) file = resolveFrom(context.directory, args.path)
        else if (args.log) file = path.join(path.dirname(resolveFrom(context.directory, args.log)), "state.json")
        else if (args.topic) file = path.join(context.directory, "lessons", slugify(args.topic), "state.json")
        else throw new Error("open requires topic, log, or path")

        const defaultPlan = defaultPlanPath(context.directory, file)
        let state
        if (fs.existsSync(file)) {
          state = loadState(file)
          if (args.log) state.log = args.log
          state.plan = args.plan || state.plan || defaultPlan
          state.status = "active"
        } else {
          if (!args.topic || !args.goal) throw new Error("Creating a lesson requires topic and goal")
          state = createState({
            topic: args.topic,
            goal: args.goal,
            log: args.log || logBySession.get(context.sessionID)?.relative,
            plan: args.plan || defaultPlan,
            sessionID: context.sessionID,
          })
          fs.mkdirSync(path.join(path.dirname(file), "assets"), { recursive: true })
        }
        attachSession(state, context.sessionID)
        saveState(file, state)
        updateProgressMap(context.directory, state)
        activeBySession.set(context.sessionID, { file, root: context.directory })
        context.metadata({ title: `Lesson: ${state.topic}` })
        return `Lesson state: ${file}\n${JSON.stringify(state, null, 2)}`
      }

      const lesson = requireLesson(context)
      const state = loadState(lesson.file)

      if (args.action === "plan") {
        validatePlan(args.nodes)
        const old = new Map(state.nodes.map((node) => [node.id, node]))
        state.nodes = args.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          deps: node.deps ?? [],
          status: node.status ?? "pending",
          attempts: old.get(node.id)?.attempts ?? [],
        }))
        saveState(lesson.file, state)
        updateProgressMap(lesson.root, state)
        return `Plan committed: ${summarize(state)}`
      }

      if (args.action === "mark") {
        if (!args.node || !args.nodeStatus) throw new Error("mark requires node and nodeStatus")
        const node = state.nodes.find((candidate) => candidate.id === args.node)
        if (!node) throw new Error(`Unknown node '${args.node}'`)
        node.status = args.nodeStatus
        saveState(lesson.file, state)
        updateProgressMap(lesson.root, state)
        return `${node.id} → ${node.status}. ${summarize(state)}`
      }

      if (args.action === "gap") {
        if (args.gap) {
          const gap = state.gaps.find((candidate) => candidate.id === args.gap)
          if (!gap) throw new Error(`Unknown gap '${args.gap}'`)
          gap.status = "covered"
          saveState(lesson.file, state)
          return `Gap ${gap.id} covered: ${gap.text}. ${summarize(state)}`
        }
        if (!args.text) throw new Error("gap requires text or a gap id")
        const gap = addGap(state, args.text)
        saveState(lesson.file, state)
        return `Gap recorded as ${gap.id}: ${gap.text}`
      }

      if (args.action === "status") return JSON.stringify(state, null, 2)

      if (args.action === "complete") {
        state.status = "complete"
        saveState(lesson.file, state)
        updateProgressMap(lesson.root, state)
        await syncTranscript(context.sessionID).catch(() => {})
        return `Lesson complete: ${summarize(state)}`
      }

      throw new Error(`Unknown action '${args.action}'`)
    },
  })

  const lessonLog = tool({
    description:
      "Link a Markdown transcript to the current OpenCode session. Professor rewrites it from the authoritative session history when each assistant turn finishes.",
    args: {
      path: tool.schema.string().describe("Markdown path relative to the project directory"),
      title: tool.schema.string().optional(),
    },
    async execute(args, context) {
      const file = resolveFrom(context.directory, args.path)
      const created = ensureMarkdown(file, args.title || path.basename(file, ".md").replace(/[-_]/g, " "))
      logBySession.set(context.sessionID, { file, relative: args.path, root: context.directory })
      const lesson = currentLesson(context)
      if (lesson) {
        const state = loadState(lesson.file)
        state.log = args.path
        attachSession(state, context.sessionID)
        saveState(lesson.file, state)
      }
      context.metadata({ title: `Lesson log: ${path.basename(path.dirname(file))}` })
      return `Lesson log: ${file}${created ? " (created)" : ""}`
    },
  })

  const writeSvg = tool({
    description:
      "Write a complete SVG document to the Professor diagram artist's session-local draft. Call professor_render_svg afterward to inspect it.",
    args: { source: tool.schema.string() },
    async execute(args, context) {
      const source = args.source.trim()
      if (!source.startsWith("<svg") || !source.includes("</svg>")) throw new Error("source must be a complete SVG document")
      const file = svgSourcePath(context.sessionID)
      fs.writeFileSync(file, source, "utf8")
      return `Wrote ${source.split("\n").length}-line SVG draft. Render it before publishing.`
    },
  })

  const editSvg = tool({
    description: "Apply one exact, uniquely matching replacement to the Professor diagram artist's SVG draft.",
    args: { old_text: tool.schema.string(), new_text: tool.schema.string() },
    async execute(args, context) {
      const file = svgSourcePath(context.sessionID)
      if (!fs.existsSync(file)) throw new Error("No SVG draft exists; call professor_write_svg first")
      const source = fs.readFileSync(file, "utf8")
      fs.writeFileSync(file, applyExactEdit(source, args.old_text, args.new_text), "utf8")
      return "Applied the SVG edit. Render again to verify it."
    },
  })

  const renderSvgTool = tool({
    description:
      "Render the Professor diagram artist's current SVG draft to an attached PNG for visual inspection. Omit save_as while iterating; provide a .svg lesson asset path only after the render is correct.",
    args: { save_as: tool.schema.string().optional() },
    async execute(args, context) {
      const file = svgSourcePath(context.sessionID)
      if (!fs.existsSync(file)) throw new Error("No SVG draft exists; call professor_write_svg first")
      const png = path.join(path.dirname(file), `render-${Date.now()}.png`)
      const result = await renderSvg(file, png)
      if (result.code !== 0 || !fs.existsSync(png)) {
        throw new Error(`SVG render failed${result.timedOut ? " (timed out)" : ""}: ${result.stderr || result.stdout}`)
      }
      let message = "Preview rendered. Inspect the attached image for clipping, overlap, incorrect labels, and misleading geometry."
      if (args.save_as) {
        if (!args.save_as.endsWith(".svg")) throw new Error("save_as must end in .svg")
        const destination = resolveFrom(context.directory, args.save_as)
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.copyFileSync(file, destination)
        message = `Published SVG source to ${destination}. Inspect the attached final render once more.`
      }
      const data = fs.readFileSync(png).toString("base64")
      return {
        title: args.save_as ? "SVG published" : "SVG preview",
        output: message,
        metadata: { published: args.save_as || null },
        attachments: [{ type: "file", mime: "image/png", url: `data:image/png;base64,${data}`, filename: "professor-preview.png" }],
      }
    },
  })

  return {
    tool: {
      professor_quiz: professorQuiz,
      lesson_state: lessonState,
      lesson_log: lessonLog,
      professor_write_svg: writeSvg,
      professor_edit_svg: editSvg,
      professor_render_svg: renderSvgTool,
    },

    "tool.execute.after": async (input, output) => {
      if (input.tool !== "question") return
      const staged = quizBySession.get(input.sessionID)
      if (!staged || !quizMatchesNative(staged, input.args)) return
      quizBySession.delete(input.sessionID)
      const answers = output.metadata?.answers
      const results = gradeQuiz(staged.prepared, answers)
      const grading = formatGrading(results)
      output.title = `Professor quiz — ${results.filter((result) => result.correct).length}/${results.length}`
      output.output = `${output.output}\n\n${grading}`
      output.metadata = { ...output.metadata, professorQuiz: { results } }

      const lesson = activeBySession.get(input.sessionID) || (() => {
        const file = findStateForSession(staged.root, input.sessionID)
        return file ? { file, root: staged.root } : undefined
      })()
      if (lesson) {
        activeBySession.set(input.sessionID, lesson)
        applyQuizResults(lesson.file, lesson.root, results)
      }
    },

    event: async ({ event }) => {
      if (event.type !== "session.idle") return
      await syncTranscript(event.properties.sessionID).catch(() => {})
    },

    dispose: async () => {
      for (const file of svgBySession.values()) fs.rmSync(path.dirname(file), { recursive: true, force: true })
      svgBySession.clear()
    },
  }
}
