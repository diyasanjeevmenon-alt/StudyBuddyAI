import React, { useEffect, useState } from "react";
import { FileText, UploadCloud, Camera, Youtube, Sparkles, Calendar, BookOpen, Layers, HelpCircle, Check, ArrowRight } from "lucide-react";

const METHODS = [
  { id: "text", label: "Paste Notes", icon: FileText, desc: "Lecture notes, essays, textbook passages" },
  { id: "pdf", label: "Upload PDF", icon: UploadCloud, desc: "Syllabi, slide decks, research papers" },
  { id: "image", label: "Photo / Diagram", icon: Camera, desc: "Handwritten pages, whiteboard formulas" },
  { id: "youtube", label: "YouTube Lecture", icon: Youtube, desc: "Video URLs with auto-transcript" },
];

const MAX_MB = 15;
const STEPS = [
  "Reading your study material",
  "Extracting core concepts & definitions",
  "Writing flashcards",
  "Composing practice exam questions",
  "Putting your study pack together",
];

function WritingProgress() {
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const a = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4200);
    const b = setTimeout(() => setSlow(true), 14000);
    return () => {
      clearInterval(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#14100e]/85 backdrop-blur-md p-6 text-center animate-fade">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-950/50">
          <Sparkles size={32} className="animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-2xl border border-amber-400/30 animate-ping opacity-25" />
      </div>

      <h3 className="font-serif text-2xl font-bold text-amber-100 tracking-tight mb-2">
        Building Your Study Pack
      </h3>

      <div className="w-full max-w-sm bg-stone-900/90 rounded-full h-2.5 border border-stone-700 overflow-hidden mb-4 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(15, ((step + 1) / STEPS.length) * 100))}%` }}
        />
      </div>

      <p className="text-sm font-serif text-amber-200/90 mb-1">
        {STEPS[step]}…
      </p>

      <p className="text-xs text-stone-400 font-sans max-w-xs leading-relaxed">
        {slow
          ? "Large documents can take up to a minute. Please keep this tab open."
          : "Creating a summary, flashcards, quiz and revision plan."}
      </p>
    </div>
  );
}

interface CreateFormProps {
  onSubmit: (formData: FormData) => void;
  busy: boolean;
  error: string;
  defaultMethod?: string;
  onSwitchPage?: (page: "left" | "right") => void;
}

export default function CreateForm({
  onSubmit,
  busy,
  error,
  defaultMethod = "text",
  onSwitchPage,
}: CreateFormProps) {
  const [method, setMethod] = useState(defaultMethod);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [mcqs, setMcqs] = useState(10);
  const [cards, setCards] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [exam, setExam] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [dragging, setDragging] = useState(false);

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  function choosePdf(f: File | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      return setLocalErr("Please select a valid .pdf file.");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return setLocalErr(`That PDF is over ${MAX_MB} MB. Please select a smaller file.`);
    }
    setLocalErr("");
    setFile(f);
  }

  function chooseImage(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      return setLocalErr("Please upload an image file (PNG, JPG, WEBP).");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return setLocalErr(`That photo is over ${MAX_MB} MB.`);
    }
    setLocalErr("");
    setImageFile(f);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr("");

    if (method === "text" && text.trim().length < 10) {
      return setLocalErr("Please paste some study notes or text (at least 10 characters) to continue.");
    }
    if (method === "pdf" && !file) {
      return setLocalErr("Please select or drop a PDF file first.");
    }
    if (method === "image" && !imageFile) {
      return setLocalErr("Please choose a study photo or diagram first.");
    }
    if (method === "youtube" && !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url.trim())) {
      return setLocalErr("Please enter a valid YouTube link (youtube.com or youtu.be).");
    }

    const fd = new FormData();
    fd.append("source_type", method);
    if (method === "text") fd.append("text", text);
    if (method === "pdf" && file) fd.append("file", file);
    if (method === "image" && imageFile) fd.append("file", imageFile);
    if (method === "youtube") {
      fd.append("youtube_url", url.trim());
      if (text.trim()) fd.append("text", text.trim());
    }
    fd.append("subject", subject.trim());
    fd.append("num_mcqs", String(mcqs));
    fd.append("num_flashcards", String(cards));
    fd.append("difficulty", difficulty);
    fd.append("exam_date", exam);

    onSubmit(fd);
  }

  return (
    <form className="study-book-spread relative" onSubmit={handleSubmit}>
      {busy && <WritingProgress />}

      <div className="study-spread-pages-row">
        {/* Left Page */}
        <div className="parchment-book-page page-verso">
        <div className="page-texture-overlay" />
        <div className="page-inner-content">
          {/* Running Header */}
          <div className="page-running-head">
            <span className="running-star">✦</span>
            <span className="running-text">STEP 1 · ADD STUDY MATERIAL</span>
            <span className="running-star">✦</span>
          </div>

          {/* Symmetrical Subhead Bar: Source Type Selector */}
          <div className="page-subhead-bar verso-subhead">
            <div className="grid grid-cols-4 gap-1.5 w-full">
              {METHODS.map((m) => {
                const isSelected = method === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMethod(m.id);
                      setLocalErr("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-sans font-medium transition-all ${
                      isSelected
                        ? "bg-[#6b2230] text-[#fdf6e7] shadow-sm font-semibold border border-[#a84457]"
                        : "bg-black/5 text-[#5c4a39] hover:bg-black/10 border border-transparent"
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left page body */}
          <div className="page-body-scroll mt-2">
            {(localErr || error) && (
              <div role="alert" className="mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-sans font-medium">
                {localErr || error}
              </div>
            )}
            {method === "text" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="notes-textarea" className="text-xs font-serif font-bold text-[#3d2f23]">
                    Paste Lecture Notes or Text Passages
                  </label>
                  <span className="text-[11px] font-mono text-[#786552]">
                    {text.trim().length.toLocaleString()} characters
                  </span>
                </div>
                <textarea
                  id="notes-textarea"
                  rows={13}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your syllabus, textbook excerpts, meeting transcripts, or handwritten transcription here..."
                  className="w-full text-xs font-serif leading-relaxed p-3 rounded-lg bg-[#fffdf8] border border-[#d6c9b3] text-[#241c14] placeholder-[#8c7b68] focus:border-[#852a3b] focus:ring-1 focus:ring-[#852a3b] focus:outline-none resize-none shadow-inner"
                />
                <p className="text-[11px] text-[#786552] italic font-serif m-0">
                  Tip: Provide thorough material. The AI tutor synthesizes definitions, flashcards, and quizzes strictly from your text.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy || text.trim().length < 10}
                    className="flex-1 py-2.5 px-4 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles size={14} className="text-stone-950" />
                    <span>Create Study Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSwitchPage?.("right")}
                    className="py-2 px-3 rounded-lg font-medium text-xs bg-black/5 hover:bg-black/10 text-[#5c4a39] border border-black/10 flex items-center justify-center gap-1 cursor-pointer"
                    title="Customize quiz count, difficulty, and flashcards"
                  >
                    <span>Options ➔</span>
                  </button>
                </div>
              </div>
            )}

            {method === "pdf" && (
              <div className="space-y-3">
                <label className="text-xs font-serif font-bold text-[#3d2f23] block">
                  Upload Course PDF Document
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragging
                      ? "border-[#852a3b] bg-[#f2e9dc]"
                      : "border-[#c4b59f] hover:border-[#852a3b] bg-[#fffcf5]"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    choosePdf(e.dataTransfer.files[0] || null);
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    id="book-pdf-input"
                    onChange={(e) => choosePdf(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="book-pdf-input" className="cursor-pointer w-full flex flex-col items-center">
                    {file ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-[#6b2230]/15 text-[#6b2230] flex items-center justify-center mx-auto border border-[#6b2230]/30">
                          <FileText size={26} />
                        </div>
                        <strong className="text-sm font-serif text-[#241c14] block">
                          {file.name}
                        </strong>
                        <span className="text-xs font-sans text-[#786552] block">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Click to choose another file
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#852a3b] flex items-center justify-center mx-auto border border-amber-500/20">
                          <UploadCloud size={28} />
                        </div>
                        <strong className="text-sm font-serif text-[#241c14] block">
                          Drop PDF here, or click to browse
                        </strong>
                        <span className="text-xs text-[#786552] block">
                          Textbooks, lecture decks, papers (up to 15 MB)
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {method === "image" && (
              <div className="space-y-3">
                <label className="text-xs font-serif font-bold text-[#3d2f23] block">
                  Upload Photo of Study Notes or Diagrams
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragging
                      ? "border-[#852a3b] bg-[#f2e9dc]"
                      : "border-[#c4b59f] hover:border-[#852a3b] bg-[#fffcf5]"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    chooseImage(e.dataTransfer.files[0] || null);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    id="book-photo-input"
                    onChange={(e) => chooseImage(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="book-photo-input" className="cursor-pointer w-full flex flex-col items-center">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Uploaded study sheet"
                          className="max-h-40 mx-auto rounded-lg border border-[#c4b59f] object-contain shadow-sm"
                        />
                        <strong className="text-xs font-serif text-[#241c14] block">
                          {imageFile?.name}
                        </strong>
                        <span className="text-[11px] text-[#852a3b] underline block">
                          Click to select a different photo
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#852a3b] flex items-center justify-center mx-auto border border-amber-500/20">
                          <Camera size={26} />
                        </div>
                        <strong className="text-sm font-serif text-[#241c14] block">
                          Drop study photo here, or click to choose
                        </strong>
                        <span className="text-xs text-[#786552] block">
                          Handwritten notes, whiteboard drawings, or textbook figures
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {method === "youtube" && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="yt-url" className="text-xs font-serif font-bold text-[#3d2f23] block mb-1">
                    YouTube Video URL
                  </label>
                  <input
                    id="yt-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-xs p-2.5 rounded-lg bg-[#fffdf8] border border-[#d6c9b3] text-[#241c14] placeholder-[#8c7b68] focus:border-[#852a3b] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="yt-notes-add" className="text-xs font-serif font-medium text-[#5c4a39] block mb-1">
                    Transcript or Extra Notes (Optional, needed if subtitles can't be fetched)
                  </label>
                  <textarea
                    id="yt-notes-add"
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Subtitles are fetched automatically. If that fails for this video, paste the transcript or your notes here."
                    className="w-full text-xs font-serif p-2.5 rounded-lg bg-[#fffdf8] border border-[#d6c9b3] text-[#241c14] placeholder-[#8c7b68] focus:border-[#852a3b] focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Folio */}
          <div className="page-bottom-folio">
            <span>· Page 1 ·</span>
          </div>
        </div>
      </div>

      {/* Center Spine */}
      <div className="book-center-spine-crease">
        <div className="spine-silk-ribbon" />
        <div className="spine-shadow-left" />
        <div className="spine-crease-core" />
        <div className="spine-shadow-right" />
      </div>

      {/* Right Page */}
      <div className="parchment-book-page page-recto">
        <div className="page-texture-overlay" />
        <div className="page-inner-content">
          {/* Running Header */}
          <div className="page-running-head">
            <span className="running-star">✦</span>
            <span className="running-text">STEP 2 · QUIZ & FLASHCARD OPTIONS</span>
            <span className="running-star">✦</span>
          </div>

          {/* Symmetrical Subhead Bar: Section title */}
          <div className="page-subhead-bar recto-subhead flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-[#4a3a2b] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#852a3b]" />
              <span>Study Settings</span>
            </span>
            <span className="text-[11px] font-sans text-[#786552]">
              Pick your questions and cards
            </span>
          </div>

          {/* Right page body */}
          <div className="page-body-scroll mt-2 space-y-4">
            {/* Subject Name Input */}
            <div>
              <label htmlFor="subject-input" className="text-xs font-serif font-bold text-[#3d2f23] block mb-1">
                Subject or Course Name (Optional)
              </label>
              <input
                id="subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Cognitive Psychology, Cell Biology, Microeconomics"
                className="w-full text-xs p-2.5 rounded-lg bg-[#fffdf8] border border-[#d6c9b3] text-[#241c14] placeholder-[#8c7b68] focus:border-[#852a3b] focus:outline-none"
              />
            </div>

            {/* MCQ Quiz Count */}
            <div>
              <label className="text-xs font-serif font-bold text-[#3d2f23] block mb-1.5 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-[#852a3b]" />
                <span>Practice Quiz Questions</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMcqs(n)}
                    className={`py-1.5 rounded-md text-xs font-sans font-semibold border transition-all ${
                      mcqs === n
                        ? "bg-[#6b2230] text-[#fdf6e7] border-[#852a3b] shadow-sm"
                        : "bg-[#fffdf8] text-[#5c4a39] border-[#d6c9b3] hover:border-[#852a3b]"
                    }`}
                  >
                    {n} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Flashcard Count */}
            <div>
              <label className="text-xs font-serif font-bold text-[#3d2f23] block mb-1.5 flex items-center gap-1.5">
                <Layers size={14} className="text-[#852a3b]" />
                <span>3D Active Recall Flashcards</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCards(n)}
                    className={`py-1.5 rounded-md text-xs font-sans font-semibold border transition-all ${
                      cards === n
                        ? "bg-[#6b2230] text-[#fdf6e7] border-[#852a3b] shadow-sm"
                        : "bg-[#fffdf8] text-[#5c4a39] border-[#d6c9b3] hover:border-[#852a3b]"
                    }`}
                  >
                    {n} Cards
                  </button>
                ))}
              </div>
            </div>

            {/* Academic Difficulty */}
            <div>
              <label className="text-xs font-serif font-bold text-[#3d2f23] block mb-1.5">
                Quiz Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 rounded-md text-xs font-sans font-semibold capitalize border transition-all ${
                      difficulty === d
                        ? "bg-[#6b2230] text-[#fdf6e7] border-[#852a3b] shadow-sm"
                        : "bg-[#fffdf8] text-[#5c4a39] border-[#d6c9b3] hover:border-[#852a3b]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Exam Date */}
            <div>
              <label htmlFor="exam-date" className="text-xs font-serif font-bold text-[#3d2f23] block mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#852a3b]" />
                <span>Exam Target Date (Optional)</span>
              </label>
              <input
                id="exam-date"
                type="date"
                min={today}
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-[#fffdf8] border border-[#d6c9b3] text-[#241c14] focus:border-[#852a3b] focus:outline-none font-sans"
              />
              <span className="text-[11px] text-[#786552] italic font-serif block mt-1">
                Setting a date generates an adaptive 7-day revision curriculum counting down to exam day.
              </span>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-stone-950 shadow-lg shadow-amber-950/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={18} className="text-stone-950" />
                <span>Create Study Guide</span>
              </button>
            </div>
          </div>

          {/* Bottom Folio */}
          <div className="page-bottom-folio">
            <span>· Page 2 ·</span>
          </div>
        </div>
      </div>
      </div>
    </form>
  );
}
