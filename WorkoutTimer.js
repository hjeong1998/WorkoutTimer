// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: stopwatch;

/*
 * Workout Rest Timer — a Scriptable widget
 *
 * Tap the widget after each set: the rest timer starts, the set counter goes
 * up, and you get a notification when rest is over.
 *
 * Widget Parameter (long-press widget > Edit Widget > Parameter):
 *   Rest length in seconds, e.g. "90" (default) or "120".
 *
 * Run the script inside the Scriptable app for a menu (different rest length,
 * undo last set, reset workout).
 */

// ---------- Settings ----------
const DEFAULT_REST_SECONDS = 90
const NEW_WORKOUT_AFTER_MIN = 90 // no taps for this long = new workout, sets reset to 0
const CLOSE_APP_AFTER_TAP = true // jump back to the home screen after tapping the widget
const NOTIFY_ID = "workout-timer-rest-done"

const COLORS = {
  idleTop: "#1f2937", idleBottom: "#111827",
  restTop: "#b45309", restBottom: "#7c2d12",
  goTop: "#15803d", goBottom: "#14532d",
  text: "#ffffff", subtle: "#ffffffb3",
}

// ---------- State storage ----------
const fm = FileManager.local()
const statePath = fm.joinPath(fm.documentsDirectory(), "workout-timer-state.json")

function loadState() {
  try {
    if (fm.fileExists(statePath)) return JSON.parse(fm.readString(statePath))
  } catch (e) { /* fall through to fresh state */ }
  return { sets: 0, workoutStart: null, restStart: null, restEnd: null, lastTap: null }
}

function saveState(s) {
  fm.writeString(statePath, JSON.stringify(s))
}

// ---------- Actions ----------
function restSecondsFrom(value) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REST_SECONDS
}

async function startRest(seconds) {
  const s = loadState()
  const now = Date.now()

  // Start a fresh workout if it's been a while since the last tap.
  if (!s.lastTap || now - s.lastTap > NEW_WORKOUT_AFTER_MIN * 60 * 1000) {
    s.sets = 0
    s.workoutStart = now
  }

  s.sets += 1
  s.restStart = now
  s.restEnd = now + seconds * 1000
  s.lastTap = now
  saveState(s)
  await scheduleRestDone(s)
  return s
}

async function scheduleRestDone(s) {
  Notification.removePending([NOTIFY_ID])
  const n = new Notification()
  n.identifier = NOTIFY_ID
  n.title = "Rest over 💪"
  n.body = `Time for set ${s.sets + 1}`
  n.sound = "default"
  n.threadIdentifier = "workout-timer"
  n.setTriggerDate(new Date(s.restEnd))
  await n.schedule()
}

async function undoLastSet() {
  const s = loadState()
  s.sets = Math.max(0, s.sets - 1)
  s.restStart = null
  s.restEnd = null
  saveState(s)
  Notification.removePending([NOTIFY_ID])
}

function resetWorkout() {
  saveState({ sets: 0, workoutStart: null, restStart: null, restEnd: null, lastTap: null })
  Notification.removePending([NOTIFY_ID])
}

// ---------- Widget ----------
function phase(s) {
  const now = Date.now()
  if (!s.restEnd) return "idle"
  if (s.lastTap && now - s.lastTap > NEW_WORKOUT_AFTER_MIN * 60 * 1000) return "idle"
  return now < s.restEnd ? "rest" : "go"
}

function gradient(top, bottom) {
  const g = new LinearGradient()
  g.colors = [new Color(top), new Color(bottom)]
  g.locations = [0, 1]
  return g
}

function addLabel(container, text, font, color = COLORS.text) {
  const t = container.addText(text)
  t.font = font
  t.textColor = new Color(color)
  t.lineLimit = 1
  t.minimumScaleFactor = 0.5
  return t
}

function addTimer(container, date, font) {
  const d = container.addDate(new Date(date))
  d.applyTimerStyle()
  d.font = font
  d.textColor = new Color(COLORS.text)
  d.lineLimit = 1
  d.minimumScaleFactor = 0.5
  return d
}

function buildWidget(s, restSeconds) {
  const w = new ListWidget()
  const family = config.widgetFamily || "small"
  const p = phase(s)
  const scriptURL = "scriptable:///run/" + encodeURIComponent(Script.name())
  w.url = `${scriptURL}?action=rest&seconds=${restSeconds}`

  // Lock screen widgets
  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true
    if (p === "rest") {
      addTimer(w, s.restEnd, Font.boldSystemFont(14)).centerAlignText()
    } else {
      addLabel(w, p === "go" ? "GO" : "▶︎", Font.boldSystemFont(18)).centerAlignText()
    }
    if (p === "rest") w.refreshAfterDate = new Date(s.restEnd)
    return w
  }
  if (family === "accessoryRectangular" || family === "accessoryInline") {
    if (p === "rest") {
      addLabel(w, `Set ${s.sets} done · Rest`, Font.mediumSystemFont(12))
      addTimer(w, s.restEnd, Font.boldSystemFont(20))
      w.refreshAfterDate = new Date(s.restEnd)
    } else if (p === "go") {
      addLabel(w, `GO · Set ${s.sets + 1}`, Font.boldSystemFont(16))
      addLabel(w, "Tap after your set", Font.systemFont(12))
    } else {
      addLabel(w, "Workout Timer", Font.boldSystemFont(14))
      addLabel(w, "Tap after your set", Font.systemFont(12))
    }
    return w
  }

  // Home screen widgets
  const big = family === "small" ? 34 : 44
  w.setPadding(14, 14, 14, 14)

  if (p === "rest") {
    w.backgroundGradient = gradient(COLORS.restTop, COLORS.restBottom)
    addLabel(w, "RESTING", Font.heavySystemFont(12), COLORS.subtle)
    w.addSpacer(4)
    addTimer(w, s.restEnd, Font.boldSystemFont(big))
    w.addSpacer()
    addLabel(w, `Set ${s.sets} done`, Font.semiboldSystemFont(14))
    addLabel(w, `Next: set ${s.sets + 1}`, Font.systemFont(12), COLORS.subtle)
    // Re-render when rest ends so the widget flips to "GO".
    w.refreshAfterDate = new Date(s.restEnd)
  } else if (p === "go") {
    w.backgroundGradient = gradient(COLORS.goTop, COLORS.goBottom)
    addLabel(w, "REST OVER", Font.heavySystemFont(12), COLORS.subtle)
    w.addSpacer(4)
    addLabel(w, `GO! Set ${s.sets + 1}`, Font.boldSystemFont(family === "small" ? 26 : 34))
    w.addSpacer()
    const row = w.addStack()
    row.centerAlignContent()
    addLabel(row, "Over by ", Font.systemFont(12), COLORS.subtle)
    const over = row.addDate(new Date(s.restEnd))
    over.applyTimerStyle()
    over.font = Font.systemFont(12)
    over.textColor = new Color(COLORS.subtle)
    addLabel(w, "Tap when set is done", Font.semiboldSystemFont(12))
  } else {
    w.backgroundGradient = gradient(COLORS.idleTop, COLORS.idleBottom)
    addLabel(w, "WORKOUT TIMER", Font.heavySystemFont(12), COLORS.subtle)
    w.addSpacer()
    addLabel(w, "Tap after", Font.boldSystemFont(family === "small" ? 22 : 28))
    addLabel(w, "your set", Font.boldSystemFont(family === "small" ? 22 : 28))
    w.addSpacer()
    addLabel(w, `Rest: ${formatSeconds(restSeconds)}`, Font.systemFont(12), COLORS.subtle)
  }

  // Workout duration on medium/large widgets
  if (family !== "small" && p !== "idle" && s.workoutStart) {
    const row = w.addStack()
    row.centerAlignContent()
    addLabel(row, "Workout ", Font.systemFont(12), COLORS.subtle)
    const el = row.addDate(new Date(s.workoutStart))
    el.applyTimerStyle()
    el.font = Font.systemFont(12)
    el.textColor = new Color(COLORS.subtle)
  }

  return w
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60)
  const r = sec % 60
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`
}

// ---------- In-app menu ----------
async function showMenu() {
  const s = loadState()
  const a = new Alert()
  a.title = "Workout Timer"
  a.message = s.sets > 0 ? `Sets done this workout: ${s.sets}` : "No sets logged yet."
  const options = [
    ["Set done — rest 60s", () => startRest(60)],
    ["Set done — rest 90s", () => startRest(90)],
    ["Set done — rest 2 min", () => startRest(120)],
    ["Set done — rest 3 min", () => startRest(180)],
    ["Undo last set", () => undoLastSet()],
    ["Reset workout", () => resetWorkout()],
    ["Preview widget", null],
  ]
  options.forEach(([label]) => a.addAction(label))
  a.addCancelAction("Close")
  const i = await a.presentSheet()
  if (i < 0) return
  const [, fn] = options[i]
  if (fn) await fn()
  const w = buildWidget(loadState(), DEFAULT_REST_SECONDS)
  await w.presentSmall()
}

// ---------- Entry point ----------
const query = args.queryParameters || {}

if (config.runsInWidget) {
  const rest = restSecondsFrom(args.widgetParameter)
  Script.setWidget(buildWidget(loadState(), rest))
} else if (query.action === "rest") {
  // Launched by tapping the widget.
  await startRest(restSecondsFrom(query.seconds))
  if (CLOSE_APP_AFTER_TAP) {
    try { App.close() } catch (e) { /* older Scriptable versions */ }
  }
} else {
  await showMenu()
}

Script.complete()
