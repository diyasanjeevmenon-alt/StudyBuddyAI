import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from "jspdf";
import { YoutubeTranscript } from "youtube-transcript";
import { extractText, getDocumentProxy } from "unpdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production" || process.argv.includes("--prod");

// ---------------------------------------------------------------------------
// Configuration (all secrets / tunables come from environment variables)
// ---------------------------------------------------------------------------
const API_KEY = process.env.GEMINI_API_KEY || "";
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";
const GENERATE_TIMEOUT_MS = Number(process.env.GENERATE_TIMEOUT_MS) || 90_000;
const CHAT_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS) || 45_000;
const MAX_SOURCE_CHARS = 100_000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, "studybuddy-data.json");

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ---------------------------------------------------------------------------
// Tiny in-memory rate limiter (protects the API key on a public deployment)
// ---------------------------------------------------------------------------
const hits = new Map<string, number[]>();
function rateLimit(max: number, windowMs: number): express.RequestHandler {
  return (req, res, next) => {
    const key = `${req.path}|${req.ip || "unknown"}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ detail: "Too many requests. Please wait a few minutes and try again." });
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// JSON file storage (one "shelf" per browser, identified by X-Client-Id)
// ---------------------------------------------------------------------------
interface StudySetRow {
  id: string;
  client_id: string;
  title: string;
  subject: string;
  source_type: string;
  source_text: string;
  pack: any;
  prefs: any;
  created_at: string;
}

function readDb(): StudySetRow[] {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

function writeDb(data: StudySetRow[]) {
  const tmp = DB_FILE + ".tmp";
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, DB_FILE);
}

function getClientId(req: express.Request): string {
  const cid = (req.headers["x-client-id"] as string) || "default-student";
  return cid.replace(/[^A-Za-z0-9-]/g, "").slice(0, 64) || "default-student";
}

function rowsForClient(cid: string): StudySetRow[] {
  return readDb()
    .filter((r) => r.client_id === cid)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function toDetail(row: StudySetRow) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    source_type: row.source_type,
    created_at: row.created_at,
    pack: row.pack,
    prefs: row.prefs,
    counts: {
      flashcards: row.pack?.flashcards?.length || 0,
      mcqs: row.pack?.mcqs?.length || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Gemini helper: timeout + automatic model fallback
// ---------------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runModel(
  params: { contents: any; config?: any },
  timeoutMs: number,
  models: string[] = [PRIMARY_MODEL, FALLBACK_MODEL]
): Promise<{ text: string; model: string }> {
  if (!ai) throw new Error("The AI service is not configured (GEMINI_API_KEY is missing on the server).");
  const unique = models.filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr: any;
  for (const model of unique) {
    try {
      const res = await withTimeout(
        ai.models.generateContent({ model, contents: params.contents, config: params.config }),
        timeoutMs,
        `Model ${model}`
      );
      const text = res.text;
      if (!text || !text.trim()) throw new Error("Empty response from model");
      return { text, model };
    } catch (e: any) {
      lastErr = e;
      console.warn(`[ai] ${model} failed:`, e?.message || e);
    }
  }
  throw lastErr || new Error("AI request failed");
}

// ---------------------------------------------------------------------------
// Input extraction helpers
// ---------------------------------------------------------------------------
async function extractPdfText(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n\n") : text;
  return (joined || "").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;|&#39;|&amp;apos;|&apos;/g, "'")
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;amp;|&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isYoutubeUrl(u: string): boolean {
  try {
    const url = new URL(u);
    const h = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    return h === "youtube.com" || h === "youtu.be" || h === "music.youtube.com";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Study pack validation (never trust model output blindly)
// ---------------------------------------------------------------------------
function normalizePack(p: any, numCards: number, numMcqs: number, wantPlan: boolean) {
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  const str = (x: any) => (typeof x === "string" ? x.trim() : "");

  const key_concepts = arr(p?.key_concepts)
    .map((c: any) => ({ name: str(c?.name), explanation: str(c?.explanation) }))
    .filter((c: any) => c.name && c.explanation)
    .slice(0, 10);

  const definitions = arr(p?.definitions)
    .map((d: any) => ({ term: str(d?.term), definition: str(d?.definition) }))
    .filter((d: any) => d.term && d.definition)
    .slice(0, 12);

  const formulas = arr(p?.formulas)
    .map((f: any) => ({ name: str(f?.name), formula: str(f?.formula), note: str(f?.note) }))
    .filter((f: any) => f.name && f.formula);

  const flashcards = arr(p?.flashcards)
    .map((c: any) => ({ question: str(c?.question), answer: str(c?.answer) }))
    .filter((c: any) => c.question && c.answer)
    .slice(0, numCards);

  const mcqs = arr(p?.mcqs)
    .map((q: any) => ({
      question: str(q?.question),
      options: arr(q?.options).map(str).filter(Boolean).slice(0, 4),
      correct_index: Number.isInteger(q?.correct_index) ? q.correct_index : -1,
      explanation: str(q?.explanation),
    }))
    .filter((q: any) => q.question && q.options.length === 4 && q.correct_index >= 0 && q.correct_index <= 3)
    .slice(0, numMcqs);

  const revision_plan = wantPlan
    ? arr(p?.revision_plan)
        .map((d: any, i: number) => ({
          day: Number.isInteger(d?.day) ? d.day : i + 1,
          focus: str(d?.focus),
          tasks: arr(d?.tasks).map(str).filter(Boolean),
        }))
        .filter((d: any) => d.focus && d.tasks.length)
        .slice(0, 7)
    : [];

  const title = str(p?.title);
  const summary = str(p?.summary);
  if (!title || !summary || !key_concepts.length || !flashcards.length || !mcqs.length) {
    throw new Error("The model returned an incomplete study pack");
  }
  return { title, summary, key_concepts, definitions, formulas, flashcards, mcqs, revision_plan };
}

// ---------------------------------------------------------------------------
// Offline fallback (used ONLY if the AI service is unavailable and we have text).
// It is rule-based, clearly flagged in the UI and documented in the README.
// ---------------------------------------------------------------------------
function synthesizeStudyPack(
  rawText: string,
  subjectHint: string,
  numCards: number,
  numMcqs: number,
  examDate: string,
  daysLeft: number
) {
  const clean = (rawText || "").trim();
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = subjectHint || "";
  if (!title && lines.length) {
    const first = lines[0].replace(/^[#*-\s]+/, "").slice(0, 50).trim();
    if (first.length > 3) title = first;
  }
  if (!title) title = "Study Guide";

  const sentences = clean
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 400);

  const key_concepts: { name: string; explanation: string }[] = [];
  const definitions: { term: string; definition: string }[] = [];
  const formulas: { name: string; formula: string; note: string }[] = [];

  for (const line of lines) {
    const eq = line.match(/^([^=]{1,30})\s*=\s*(.+)$/);
    if (eq && line.length < 120) {
      formulas.push({ name: eq[1].trim(), formula: `${eq[1].trim()} = ${eq[2].trim()}`, note: "" });
      continue;
    }
    const def = line.match(/^([A-Za-z0-9][A-Za-z0-9\s]{1,30})\s*[:\-–]\s*(.{15,})$/);
    if (def) {
      definitions.push({ term: def[1].trim(), definition: def[2].trim() });
      key_concepts.push({ name: def[1].trim(), explanation: def[2].trim() });
    }
  }

  for (let i = 0; key_concepts.length < 5 && i < sentences.length; i++) {
    const s = sentences[i];
    if (key_concepts.some((c) => c.explanation === s)) continue;
    const name = s.split(" ").slice(0, 4).join(" ").replace(/[^A-Za-z0-9 ]/g, "").trim() || `Point ${i + 1}`;
    key_concepts.push({ name, explanation: s });
  }
  if (!key_concepts.length) key_concepts.push({ name: title, explanation: clean.slice(0, 200) || title });
  if (definitions.length < 3) {
    for (const c of key_concepts.slice(0, 5)) {
      if (!definitions.some((d) => d.term === c.name)) definitions.push({ term: c.name, definition: c.explanation });
    }
  }

  const body = sentences.slice(0, 8);
  const summary = body.length
    ? `${body.slice(0, 4).join(" ")}\n\n${body.slice(4, 8).join(" ")}`.trim()
    : `Study notes on ${title}. Review the key concepts, definitions, flashcards and practice questions.`;

  const pool = key_concepts;
  const flashcards = Array.from({ length: numCards }, (_, i) => {
    const item = pool[i % pool.length];
    return { question: `What does the material say about "${item.name}"?`, answer: item.explanation.slice(0, 220) };
  });

  const short = (s: string) => (s.length > 110 ? s.slice(0, 107) + "..." : s);
  const generic = [
    "This idea is not covered in the study material.",
    "It is described as the opposite of what the notes state.",
    "It only applies in situations the notes do not discuss.",
  ];
  const mcqs = Array.from({ length: numMcqs }, (_, i) => {
    const item = pool[i % pool.length];
    const correct = short(item.explanation);
    const others = pool.filter((c) => c !== item).map((c) => short(c.explanation));
    const distractors: string[] = [];
    for (let k = 0; k < others.length && distractors.length < 3; k++) {
      const cand = others[(i + k) % others.length];
      if (cand !== correct && !distractors.includes(cand)) distractors.push(cand);
    }
    for (const g of generic) if (distractors.length < 3) distractors.push(g);
    const correctIdx = i % 4;
    const options = [...distractors];
    options.splice(correctIdx, 0, correct);
    return {
      question: `Which statement correctly describes "${item.name}"?`,
      options,
      correct_index: correctIdx,
      explanation: `According to the material: ${correct}`,
    };
  });

  const revision_plan = examDate
    ? [
        { day: 1, focus: "Read and understand", tasks: ["Read the summary", "Go through the key concepts"] },
        { day: 2, focus: "Definitions and formulas", tasks: ["Write out each definition from memory", "Practise the formulas"] },
        { day: 3, focus: "Flashcards", tasks: ["Run through every flashcard once", "Mark the ones you missed"] },
        { day: 4, focus: "Practice quiz", tasks: ["Take the practice quiz", "Read the explanations for wrong answers"] },
        { day: 5, focus: "Weak spots", tasks: ["Re-read topics you missed", "Ask the tutor about anything unclear"] },
        { day: 6, focus: "Full revision", tasks: ["Repeat flashcards", "Retake the quiz"] },
        { day: 7, focus: `Final review (${Math.max(daysLeft, 0)} days to exam)`, tasks: ["Light skim of the summary", "Rest well"] },
      ]
    : [];

  return { title, summary, key_concepts: key_concepts.slice(0, 10), definitions: definitions.slice(0, 12), formulas, flashcards, mcqs, revision_plan };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai_configured: Boolean(ai), timestamp: new Date().toISOString() });
});

app.get("/api/sets", (req, res) => {
  const rows = rowsForClient(getClientId(req));
  res.json(
    rows.map((r) => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      source_type: r.source_type,
      created_at: r.created_at,
      counts: { flashcards: r.pack?.flashcards?.length || 0, mcqs: r.pack?.mcqs?.length || 0 },
    }))
  );
});

app.get("/api/sets/:id", (req, res) => {
  const row = rowsForClient(getClientId(req)).find((r) => r.id === req.params.id);
  if (!row) return res.status(404).json({ detail: "That study set was not found." });
  res.json(toDetail(row));
});

app.delete("/api/sets/:id", (req, res) => {
  const cid = getClientId(req);
  const all = readDb();
  if (!all.some((r) => r.id === req.params.id && r.client_id === cid)) {
    return res.status(404).json({ detail: "Study set not found." });
  }
  writeDb(all.filter((r) => !(r.id === req.params.id && r.client_id === cid)));
  res.json({ ok: true });
});

app.post("/api/generate", rateLimit(15, 10 * 60 * 1000), upload.single("file"), async (req, res) => {
  try {
    const cid = getClientId(req);
    const body = req.body || {};
    const source_type: string = body.source_type || "text";
    const text: string = typeof body.text === "string" ? body.text : "";
    const youtube_url: string = (body.youtube_url || "").trim();
    const subject: string = (body.subject || "").trim();
    const num_mcqs = Math.max(3, Math.min(Number(body.num_mcqs) || 10, 20));
    const num_flashcards = Math.max(3, Math.min(Number(body.num_flashcards) || 10, 30));
    const difficulty: string = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";

    let exam_date: string = body.exam_date || "";
    let daysLeft = 0;
    if (exam_date) {
      const target = new Date(exam_date);
      if (isNaN(target.getTime())) {
        exam_date = "";
      } else {
        daysLeft = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
        if (daysLeft < 0) {
          exam_date = "";
          daysLeft = 0;
        }
      }
    }

    const parts: any[] = [];
    let sourceText = ""; // text kept for chat grounding + offline fallback
    let truncated = false;
    const capText = (t: string) => {
      if (t.length > MAX_SOURCE_CHARS) truncated = true;
      return t.slice(0, MAX_SOURCE_CHARS);
    };

    if (source_type === "pdf") {
      let buf: Buffer | null = null;
      if (req.file) buf = req.file.buffer;
      else if (body.pdf_base64) buf = Buffer.from(String(body.pdf_base64).replace(/^data:application\/pdf;base64,/, ""), "base64");
      if (!buf || buf.length === 0) return res.status(400).json({ detail: "Please provide a PDF file." });
      if (buf.slice(0, 5).toString("latin1") !== "%PDF-") {
        return res.status(400).json({ detail: "That file does not look like a valid PDF." });
      }

      let pdfText = "";
      try {
        pdfText = await extractPdfText(buf);
      } catch (e: any) {
        console.warn("[pdf] text extraction failed:", e?.message || e);
      }

      if (pdfText.length >= 200) {
        sourceText = capText(pdfText);
        parts.push({ text: `STUDY MATERIAL (text extracted from the student's PDF):\n"""\n${sourceText}\n"""` });
      } else {
        // Probably a scanned PDF: let the multimodal model read the pages directly.
        if (!ai) {
          return res.status(422).json({
            detail: "This PDF has no selectable text (it looks scanned) and the AI service is not configured to read it.",
          });
        }
        parts.push({ inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } });
      }
    } else if (source_type === "image") {
      if (req.file) {
        parts.push({ inlineData: { mimeType: req.file.mimetype || "image/jpeg", data: req.file.buffer.toString("base64") } });
      } else if (body.image_base64) {
        parts.push({
          inlineData: {
            mimeType: body.image_mime || "image/jpeg",
            data: String(body.image_base64).replace(/^data:[^;]+;base64,/, ""),
          },
        });
      } else {
        return res.status(400).json({ detail: "Please provide a study photo." });
      }
      if (text.trim()) {
        sourceText = capText(text.trim());
        parts.push({ text: `TRANSCRIPTION / NOTES FROM THE PHOTO:\n"""\n${sourceText}\n"""` });
      }
    } else if (source_type === "youtube") {
      if (!youtube_url || !isYoutubeUrl(youtube_url)) {
        return res.status(400).json({ detail: "Please enter a valid YouTube link (youtube.com or youtu.be)." });
      }
      let transcript = "";
      try {
        const items = await YoutubeTranscript.fetchTranscript(youtube_url);
        transcript = decodeEntities((items || []).map((i) => i.text).join(" ")).replace(/\s+/g, " ").trim();
      } catch (e: any) {
        console.warn("[youtube] transcript fetch failed:", e?.message || e);
      }
      if (transcript) {
        sourceText = capText(transcript + (text.trim() ? `\n\nSTUDENT NOTES:\n${text.trim()}` : ""));
      } else if (text.trim().length >= 30) {
        sourceText = capText(text.trim());
      } else {
        return res.status(400).json({
          detail:
            "Could not fetch subtitles for this video (it may have captions disabled, or YouTube blocked the request). Paste the transcript or your notes into the text box and try again.",
        });
      }
      parts.push({ text: `YOUTUBE LECTURE (${youtube_url}) TRANSCRIPT / NOTES:\n"""\n${sourceText}\n"""` });
    } else {
      if (text.trim().length < 10) {
        return res.status(400).json({ detail: "Please provide some study notes (at least 10 characters)." });
      }
      sourceText = capText(text.trim());
      parts.push({ text: `STUDY MATERIAL:\n"""\n${sourceText}\n"""` });
    }

    const planInstruction = exam_date
      ? `Create a 7-day revision plan (7 entries, day 1 to 7) that prepares for the exam on ${exam_date} (${daysLeft} days from now). Day 7 is the day before the exam: light review, weak spots and rest. If fewer than 7 days remain, still return 7 entries but keep the earliest ones light.`
      : `No exam date was provided, so revision_plan must be an empty array [].`;

    const prompt = `
Create a study pack from the material provided.
Subject hint: ${subject || "(none given, infer it)"}

Return JSON with exactly these keys:
{
  "title": short descriptive title (max 8 words),
  "summary": 150-300 words, plain prose, paragraphs separated by a blank line,
  "key_concepts": 5-10 items {"name": string, "explanation": 1-2 sentences},
  "definitions": up to 12 items {"term": string, "definition": string} for important terms the material defines or relies on,
  "formulas": items {"name": string, "formula": string, "note": string}; [] if the material has no formulas. Write formulas in plain text/Unicode, no LaTeX,
  "flashcards": exactly ${num_flashcards} items {"question": string, "answer": string (max 40 words)},
  "mcqs": exactly ${num_mcqs} items {"question": string, "options": [exactly 4 strings, no "A)" prefixes], "correct_index": 0-3, "explanation": 1-2 sentences saying why the answer is right},
  "revision_plan": ${planInstruction}
}

Rules:
- Quiz difficulty: ${difficulty}. Easy = recall of facts; medium = understanding; hard = application.
- Distractors must be plausible. Vary the position of the correct answer.
- Use only information from the material. Cover the whole material.
`;
    parts.push({ text: prompt });

    const str = { type: Type.STRING };
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: str,
        summary: str,
        key_concepts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: str, explanation: str }, required: ["name", "explanation"] } },
        definitions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: str, definition: str }, required: ["term", "definition"] } },
        formulas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: str, formula: str, note: str }, required: ["name", "formula"] } },
        flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: str, answer: str }, required: ["question", "answer"] } },
        mcqs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { question: str, options: { type: Type.ARRAY, items: str }, correct_index: { type: Type.INTEGER }, explanation: str },
            required: ["question", "options", "correct_index", "explanation"],
          },
        },
        revision_plan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { day: { type: Type.INTEGER }, focus: str, tasks: { type: Type.ARRAY, items: str } },
            required: ["day", "focus", "tasks"],
          },
        },
      },
      required: ["title", "summary", "key_concepts", "flashcards", "mcqs"],
    };

    const config = {
      systemInstruction:
        "You are a meticulous study-material author. Build everything strictly from the study material and reply with valid JSON only.",
      responseMimeType: "application/json",
      responseSchema,
    };

    let pack: any;
    let fallback = false;
    let aiError = "";
    try {
      // Up to two attempts: validation failures get one retry.
      let lastErr: any;
      for (let attempt = 0; attempt < 2 && !pack; attempt++) {
        try {
          const { text: raw } = await runModel({ contents: { parts }, config }, GENERATE_TIMEOUT_MS);
          const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
          pack = normalizePack(JSON.parse(cleaned), num_flashcards, num_mcqs, Boolean(exam_date));
        } catch (e: any) {
          lastErr = e;
          console.warn(`[generate] attempt ${attempt + 1} failed:`, e?.message || e);
        }
      }
      if (!pack) throw lastErr || new Error("Generation failed");
    } catch (e: any) {
      aiError = e?.message || "AI unavailable";
      if (sourceText.length >= 50) {
        console.warn("[generate] using offline fallback:", aiError);
        pack = synthesizeStudyPack(sourceText, subject, num_flashcards, num_mcqs, exam_date, daysLeft);
        fallback = true;
      } else {
        return res.status(502).json({
          detail: `The AI service could not generate your study pack right now (${aiError}). Please try again in a minute.`,
        });
      }
    }

    const newSet: StudySetRow = {
      id: "set-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      client_id: cid,
      title: (pack.title || subject || "Study Set").slice(0, 200),
      subject: (subject || "").slice(0, 120),
      source_type,
      source_text: sourceText,
      pack,
      prefs: {
        num_mcqs,
        num_flashcards,
        difficulty,
        exam_date,
        truncated,
        fallback,
        notice: fallback
          ? "The AI service was unavailable, so this set was built with a simple offline method. Quality is lower. Try again later for a full AI-generated pack."
          : truncated
          ? "Your material was very long, so only the first part was used."
          : "",
      },
      created_at: new Date().toISOString(),
    };

    const rows = readDb();
    rows.unshift(newSet);
    writeDb(rows);
    res.json(toDetail(newSet));
  } catch (err: any) {
    console.error("Error generating pack:", err);
    res.status(500).json({ detail: err.message || "Could not generate study pack." });
  }
});

app.post("/api/chat", rateLimit(60, 10 * 60 * 1000), async (req, res) => {
  try {
    const cid = getClientId(req);
    const { set_id, message, history, role = "tutor" } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ detail: "Please enter a question." });
    }
    if (message.length > 4000) return res.status(400).json({ detail: "That question is too long." });

    let notesContext = "";
    if (set_id) {
      const row = readDb().find((r) => r.id === set_id && r.client_id === cid);
      if (row) {
        notesContext = `TITLE: ${row.title}
SUBJECT: ${row.subject}
SUMMARY: ${row.pack?.summary || ""}
KEY CONCEPTS: ${JSON.stringify(row.pack?.key_concepts || [])}
DEFINITIONS: ${JSON.stringify(row.pack?.definitions || [])}
FORMULAS: ${JSON.stringify(row.pack?.formulas || [])}
FULL NOTES:
${(row.source_text || "").slice(0, 60_000)}`;
      }
    }

    const boundaryRule = `
CRITICAL BOUNDARY RULE:
Answer ONLY using the student's study material below. If the answer is not in the material, reply exactly: "The requested information was not found in the provided material." You may briefly suggest what to look up, but do not state outside facts as if they were in the notes.`;
    const notesBlock = notesContext ? `STUDENT'S STUDY MATERIAL:\n"""\n${notesContext}\n"""` : "";

    let systemInstruction: string;
    let models: string[] = [PRIMARY_MODEL, FALLBACK_MODEL];
    if (role === "deep_solver") {
      systemInstruction = `You are a careful STEM problem-solving tutor. Show each step clearly, using only the student's material.${boundaryRule}\n${notesBlock}`;
    } else if (role === "fast_review") {
      models = [FALLBACK_MODEL, PRIMARY_MODEL];
      systemInstruction = `You are a quick-review coach. Give short bullet-point answers, definitions and mnemonics based strictly on the student's material.${boundaryRule}\n${notesBlock}`;
    } else if (role === "socratic") {
      systemInstruction = `You are a Socratic tutor. Ask thoughtful follow-up questions and give gentle hints instead of giving the answer away, grounded strictly in the student's material.${boundaryRule}\n${notesBlock}`;
    } else {
      systemInstruction = `You are a friendly study tutor. Explain clearly, with examples where they help, using the student's material. Be concise and encouraging.${boundaryRule}\n${notesBlock}`;
    }

    const contents: any[] = [];
    const past = Array.isArray(history) ? history.slice(-8) : [];
    for (const turn of past) {
      const t = typeof turn?.text === "string" ? turn.text.slice(0, 6000) : "";
      if (!t) continue;
      contents.push({ role: turn.role === "assistant" || turn.role === "model" ? "model" : "user", parts: [{ text: t }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    try {
      const { text, model } = await runModel({ contents, config: { systemInstruction } }, CHAT_TIMEOUT_MS, models);
      res.json({ reply: text, model, role });
    } catch (e: any) {
      console.error("Chat failed:", e?.message || e);
      res.status(502).json({
        detail: ai
          ? "The tutor could not reach the AI service. Please try again in a moment."
          : "The tutor is unavailable because the server has no AI key configured.",
      });
    }
  } catch (err: any) {
    console.error("Error in chat:", err);
    res.status(500).json({ detail: err.message || "Failed to get an answer from the tutor." });
  }
});

app.post("/api/analyze-image", rateLimit(20, 10 * 60 * 1000), async (req, res) => {
  try {
    const { image_base64, mime_type = "image/jpeg", prompt = "Analyze this study photo", analysis_type = "general" } = req.body || {};
    if (!image_base64) return res.status(400).json({ detail: "Image data is required." });
    if (!/^image\/(png|jpe?g|webp|gif|heic|heif)$/i.test(String(mime_type))) {
      return res.status(400).json({ detail: "Unsupported image type." });
    }
    const cleanBase64 = String(image_base64).replace(/^data:[^;]+;base64,/, "");

    try {
      const { text, model } = await runModel(
        {
          contents: {
            parts: [
              { inlineData: { mimeType: mime_type, data: cleanBase64 } },
              {
                text: `Analyze this study photo (handwritten notes, textbook page, diagram, whiteboard or exam paper).
Focus: ${String(prompt).slice(0, 500)}
Mode: ${String(analysis_type).slice(0, 40)}

Provide:
1. Overview and content type
2. Transcription of handwritten or printed text
3. Core concepts explained
4. Key definitions and formulas
5. Suggested practice questions`,
              },
            ],
          },
          config: { systemInstruction: "You are an academic vision assistant. Analyze study photos accurately and clearly." },
        },
        GENERATE_TIMEOUT_MS
      );
      res.json({ analysis: text, model, analysis_type });
    } catch (e: any) {
      console.error("Image analysis failed:", e?.message || e);
      res.status(502).json({
        detail: ai
          ? "The photo could not be analysed right now. Please try again in a moment."
          : "Photo analysis is unavailable because the server has no AI key configured.",
      });
    }
  } catch (err: any) {
    console.error("Error analyzing image:", err);
    res.status(500).json({ detail: err.message || "Image analysis failed." });
  }
});

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------
const CHAR_MAP: Record<string, string> = {
  "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇌": "<=>", "≈": "~", "≠": "!=", "≤": "<=", "≥": ">=",
  "−": "-", "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "•": "-",
  "∞": "infinity", "√": "sqrt", "∑": "sum", "Σ": "Sum", "Δ": "Delta", "δ": "delta", "α": "alpha",
  "β": "beta", "γ": "gamma", "θ": "theta", "λ": "lambda", "π": "pi", "σ": "sigma", "ω": "omega",
  "Ω": "Omega", "ρ": "rho", "φ": "phi", "ε": "epsilon", "η": "eta", "τ": "tau", "∂": "d", "∫": "integral",
  "∝": "proportional to", "⁻": "^-", "⁺": "^+", "₀": "_0", "₁": "_1", "₂": "_2", "₃": "_3", "⁴": "^4",
  "✦": "", "✓": "[x]", "\u00a0": " ",
};
function pdfSafe(input: any): string {
  let out = String(input ?? "");
  for (const [k, v] of Object.entries(CHAR_MAP)) out = out.split(k).join(v);
  // jsPDF's built-in fonts only cover Latin-1
  return out.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

app.get("/api/sets/:id/pdf", (req, res) => {
  const row = rowsForClient(getClientId(req)).find((r) => r.id === req.params.id);
  if (!row) return res.status(404).json({ detail: "Study set not found." });

  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const BOTTOM = 276;
    let y = 24;
    const INK: [number, number, number] = [28, 23, 18];
    const MUTED: [number, number, number] = [91, 81, 67];
    const ACCENT: [number, number, number] = [107, 34, 48];

    const ensure = (h: number) => {
      if (y + h > BOTTOM) {
        doc.addPage();
        y = 20;
      }
    };

    const block = (
      text: string,
      o: { font?: string; style?: string; size?: number; color?: [number, number, number]; indent?: number; lh?: number; gap?: number } = {}
    ) => {
      const { font = "times", style = "normal", size = 10.5, color = INK, indent = 0, lh = 4.8, gap = 2 } = o;
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(pdfSafe(text), contentWidth - indent) as string[];
      for (const line of lines) {
        ensure(lh);
        doc.text(line, margin + indent, y);
        y += lh;
      }
      y += gap;
    };

    const heading = (title: string) => {
      ensure(18);
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text(pdfSafe(title), margin, y);
      y += 3;
      doc.setDrawColor(201, 189, 163);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    };

    // Title block
    block(row.title, { style: "bold", size: 22, lh: 8, gap: 2 });
    const madeOn = new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    block(`${row.subject ? row.subject + "  |  " : ""}Created ${madeOn}  |  Study Buddy AI`, {
      font: "helvetica", size: 10, color: MUTED, gap: 3,
    });
    doc.setDrawColor(201, 189, 163);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const p = row.pack || {};

    if (p.summary) {
      heading("Summary");
      for (const para of String(p.summary).split(/\n\n+/)) block(para.trim(), { gap: 3 });
      y += 3;
    }

    if (p.key_concepts?.length) {
      heading("Key concepts");
      for (const c of p.key_concepts) {
        block(c.name, { style: "bold", gap: 0.5 });
        block(c.explanation, { indent: 4, gap: 3 });
      }
      y += 3;
    }

    if (p.definitions?.length) {
      heading("Definitions");
      for (const d of p.definitions) {
        block(d.term, { style: "bold", size: 10, gap: 0.5 });
        block(d.definition, { size: 10, indent: 4, gap: 2.5 });
      }
      y += 3;
    }

    if (p.formulas?.length) {
      heading("Formulas");
      for (const f of p.formulas) {
        block(f.name, { style: "bold", gap: 0.5 });
        block(f.formula, { font: "courier", size: 10, indent: 4, gap: 0.5 });
        if (f.note) block(f.note, { style: "italic", size: 9, color: MUTED, indent: 4, gap: 0.5 });
        y += 2.5;
      }
      y += 3;
    }

    if (p.flashcards?.length) {
      heading("Flashcards");
      const colW = contentWidth * 0.48;
      for (let i = 0; i < p.flashcards.length; i++) {
        const card = p.flashcards[i];
        doc.setFontSize(9.5);
        doc.setFont("times", "bold");
        const ql = doc.splitTextToSize(pdfSafe(`Q: ${card.question}`), colW) as string[];
        doc.setFont("times", "normal");
        const al = doc.splitTextToSize(pdfSafe(`A: ${card.answer}`), colW) as string[];
        const rowH = Math.max(ql.length, al.length) * 4.6 + 5;
        ensure(rowH + 2);
        const shade = i % 2 === 0 ? [245, 240, 230] : [239, 234, 224];
        doc.setFillColor(shade[0], shade[1], shade[2]);
        doc.rect(margin, y - 3.5, contentWidth, rowH, "F");
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.setFont("times", "bold");
        doc.text(ql, margin + 2, y + 1);
        doc.setFont("times", "normal");
        doc.text(al, margin + contentWidth * 0.5 + 2, y + 1);
        y += rowH + 1.5;
      }
      y += 4;
    }

    if (p.mcqs?.length) {
      heading("Multiple-choice questions");
      const L = ["A", "B", "C", "D"];
      for (let i = 0; i < p.mcqs.length; i++) {
        const q = p.mcqs[i];
        ensure(30);
        block(`${i + 1}. ${q.question}`, { style: "bold", size: 10, gap: 1 });
        for (let k = 0; k < q.options.length; k++) {
          block(`${L[k]}. ${q.options[k]}`, { font: "helvetica", size: 9, indent: 5, lh: 4.2, gap: 0.3 });
        }
        block(`Answer: ${L[q.correct_index]}. ${q.explanation || ""}`, {
          style: "italic", size: 9, color: MUTED, indent: 5, lh: 4.2, gap: 4,
        });
      }
      y += 2;
    }

    if (p.revision_plan?.length) {
      heading("7-day revision plan");
      for (const d of p.revision_plan) {
        ensure(16);
        block(`Day ${d.day}: ${d.focus}`, { style: "bold", size: 10, gap: 0.5 });
        for (const t of d.tasks || []) block(`- ${t}`, { size: 10, indent: 5, lh: 4.4, gap: 0.3 });
        y += 2.5;
      }
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text("Study Buddy AI", margin, 288);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, 288);
    }

    const safeName = (row.title || "study-pack").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60) || "study-pack";
    const pdfBuf = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    res.send(pdfBuf);
  } catch (err: any) {
    console.error("PDF export error:", err);
    res.status(500).json({ detail: "Failed to generate the PDF." });
  }
});

app.all("/api/*", (_req, res) => {
  res.status(404).json({ detail: "API endpoint not found." });
});

// JSON error handler (upload too large, bad JSON, etc.)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  if (err?.code === "LIMIT_FILE_SIZE" || err?.type === "entity.too.large") {
    return res.status(413).json({ detail: "That file is too large (limit 25 MB)." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ detail: "The request could not be read." });
  }
  console.error("Unhandled error:", err);
  res.status(err?.status || 500).json({ detail: err?.message || "Server error." });
});

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error("dist/index.html not found. Run `npm run build` before `npm start`.");
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study Buddy AI running on http://0.0.0.0:${PORT} (${IS_PROD ? "production" : "development"})`);
    if (!ai) console.warn("WARNING: GEMINI_API_KEY is not set. AI features will not work.");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
