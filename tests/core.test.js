import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  applyQuizResults,
  createState,
  gradeQuiz,
  loadState,
  prepareQuiz,
  renderProgressMap,
  renderTranscript,
  saveState,
  slugify,
  updateProgressMap,
  validatePlan,
} from "../.opencode/lib/professor-core.js"

test("slugify creates stable lesson folder names", () => {
  assert.equal(slugify("HTTP & JSON — Basics"), "http-json-basics")
})

test("quiz preparation adds IDK and grading is exact", () => {
  const { prepared, nativeQuestions } = prepareQuiz(
    [
      {
        id: "http-method",
        label: "Methods",
        prompt: "Which method normally retrieves a resource?",
        options: ["GET", "POST", "DELETE"],
        correctAnswer: "GET",
        explanation: "GET requests a representation without asking to create or delete it.",
        shuffle: false,
      },
      {
        id: "json-values",
        prompt: "Which are JSON value types?",
        options: ["string", "number", "function"],
        correctAnswer: ["string", "number"],
        multiSelect: true,
        explanation: "JSON has strings and numbers, but not executable functions.",
        shuffle: false,
      },
    ],
    () => 0.5,
  )

  assert.deepEqual(
    nativeQuestions[0].options.map((option) => option.label),
    ["GET", "POST", "DELETE", "I don't know"],
  )
  const results = gradeQuiz(prepared, [["GET"], ["number", "string"]])
  assert.equal(results[0].correct, true)
  assert.equal(results[1].correct, true)

  const idk = gradeQuiz(prepared, [["I don't know"], []])
  assert.equal(idk[0].idk, true)
  assert.equal(idk[1].correct, false)
})

test("plan validation rejects cycles", () => {
  assert.throws(
    () =>
      validatePlan([
        { id: "a", deps: ["b"] },
        { id: "b", deps: ["a"] },
      ]),
    /cycle/,
  )
})

test("correct quiz evidence verifies a matching node and refreshes Mermaid", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "professor-test-"))
  try {
    const folder = path.join(root, "lessons", "http")
    const file = path.join(folder, "state.json")
    const state = createState({
      topic: "HTTP",
      goal: "Explain a request",
      log: "lessons/http/lesson.md",
      plan: "HTTP — Learning Plan.md",
      sessionID: "session-1",
    })
    state.nodes = [
      { id: "url", title: "URL parts", deps: [], status: "prior", attempts: [] },
      { id: "request", title: "HTTP request", deps: ["url"], status: "pending", attempts: [] },
    ]
    saveState(file, state)
    updateProgressMap(root, state)

    applyQuizResults(file, root, [
      {
        id: "request",
        label: "Request",
        prompt: "test",
        selected: ["correct"],
        correctAnswers: ["correct"],
        correct: true,
        idk: false,
        explanation: "",
      },
    ])

    const next = loadState(file)
    assert.equal(next.nodes[1].status, "verified")
    const plan = fs.readFileSync(path.join(root, "HTTP — Learning Plan.md"), "utf8")
    assert.match(plan, /HTTP request<br\/>Verified/)
    assert.match(renderProgressMap(next), /1\/1 taught nodes verified/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("transcript includes user and assistant text plus plugin quiz grading", () => {
  const transcript = renderTranscript("HTTP", "2026-01-02T00:00:00.000Z", [
    {
      info: { role: "user" },
      parts: [{ type: "text", text: "Teach me HTTP" }],
    },
    {
      info: { role: "assistant" },
      parts: [
        { type: "text", text: "Let us begin." },
        {
          type: "tool",
          tool: "question",
          state: {
            status: "completed",
            metadata: {
              professorQuiz: {
                results: [
                  {
                    id: "request",
                    label: "Request",
                    selected: ["GET"],
                    correctAnswers: ["GET"],
                    correct: true,
                    idk: false,
                    explanation: "GET retrieves a representation.",
                  },
                ],
              },
            },
          },
        },
      ],
    },
  ])
  assert.match(transcript, /> Teach me HTTP/)
  assert.match(transcript, /Let us begin\./)
  assert.match(transcript, /Professor grading/)
  assert.match(transcript, /Score: 1\/1/)
})
