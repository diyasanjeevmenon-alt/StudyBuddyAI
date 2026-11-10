import React, { useState } from "react";
import { analyzeImage, chat } from "../api";
import { Camera, Sparkles, UploadCloud, Copy, Check, BookOpen, MessageSquare, ArrowRight, X } from "lucide-react";
import { GeneratePayload } from "../api";

interface ImageAnalyzerProps {
  onClose: () => void;
  onCreateNotebookFromImage: (payload: GeneratePayload) => void;
}

const MODES = [
  { id: "general", label: "Study Breakdown", desc: "Transcribe text, extract concepts, and explain key takeaways" },
  { id: "handwriting", label: "Decipher Handwriting", desc: "Clean up messy notes, shorthand, and handwritten lectures" },
  { id: "diagram", label: "Diagram / Chart", desc: "Deconstruct flowcharts, cycles, anatomy, and technical figures" },
  { id: "math", label: "Math & Proofs", desc: "Analyze handwritten equations, derivations, and step-by-step logic" },
];

export default function ImageAnalyzer({ onClose, onCreateNotebookFromImage }: ImageAnalyzerProps) {
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [fileName, setFileName] = useState<string>("");
  const [mode, setMode] = useState<string>("general");
  const [prompt, setPrompt] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);

  // Follow-up question state
  const [question, setQuestion] = useState("");
  const [qBusy, setQBusy] = useState(false);
  const [qHistory, setQHistory] = useState<Array<{ q: string; a: string }>>([]);

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    setError("");
    setFileName(f.name);
    setImageMime(f.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(f);
  }

  async function handleAnalyze() {
    if (!imageBase64) {
      setError("Please upload an image first.");
      return;
    }
    setBusy(true);
    setError("");
    setResult("");
    setQHistory([]);

    try {
      const res = await analyzeImage(
        imageBase64,
        imageMime,
        prompt || "Provide an in-depth academic analysis of this study photo.",
        mode
      );
      setResult(res.analysis);
    } catch (e: any) {
      setError(e.message || "Failed to analyze study photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAskFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || qBusy || !result) return;

    const userQ = question.trim();
    setQuestion("");
    setQBusy(true);

    try {
      const contextHistory = [
        {
          role: "user" as const,
          text: `Here is the visual material analysis:\n"""\n${result}\n"""`,
        },
        ...qHistory.flatMap((item) => [
          { role: "user" as const, text: item.q },
          { role: "assistant" as const, text: item.a },
        ]),
      ];

      const res = await chat(null, userQ, contextHistory, "deep_solver");
      setQHistory((prev) => [...prev, { q: userQ, a: res.reply }]);
    } catch (err: any) {
      setError(err.message || "Failed to answer follow-up question.");
    } finally {
      setQBusy(false);
    }
  }

  function handleCreateNotebook() {
    if (!result && !imageBase64) return;
    const combinedNotes = `${result}\n\nAdditional Context:\nScholarly analysis transcribed from study photo ${fileName}.`;

    onCreateNotebookFromImage({
      source_type: "image",
      image_base64: imageBase64,
      image_mime: imageMime,
      text: combinedNotes,
      subject: fileName.replace(/\.[^/.]+$/, ""),
      num_mcqs: 10,
      num_flashcards: 10,
      difficulty: "medium",
    });
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md animate-fade">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/40 bg-[#141210] text-[#f8fafc] shadow-2xl shadow-black/90 overflow-hidden ring-1 ring-amber-500/20">
        {/* Header with High-Contrast Crisp Elements */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-[#1c1815]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-md shadow-amber-950/40">
              <Camera size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold font-serif text-white tracking-tight m-0">
                  Scan Notes or Photos
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/40">
                  ✦ AI Scanner
                </span>
              </div>
              <p className="text-xs text-stone-300 m-0 mt-0.5">
                Upload a photo of your handwritten notes, whiteboard, or textbook to create a study guide.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#141210]">
          {/* Left Column: Upload and Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* High-Contrast Dropzone */}
            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all cursor-pointer min-h-[190px] ${
                dragging
                  ? "border-amber-400 bg-amber-950/30 scale-[1.01]"
                  : "border-stone-700 hover:border-amber-400/70 bg-[#1d1916] hover:bg-[#241f1b]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0] || null);
              }}
            >
              <input
                type="file"
                accept="image/*"
                hidden
                id="modal-image-input"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="modal-image-input" className="cursor-pointer w-full">
                {imageBase64 ? (
                  <div className="relative group">
                    <img
                      src={imageBase64}
                      alt="Uploaded study sheet"
                      className="max-h-48 mx-auto rounded-lg border-2 border-amber-500/50 object-contain shadow-lg"
                    />
                    <div className="mt-2.5 text-xs text-white font-medium truncate max-w-full font-mono bg-stone-900/90 py-1 px-2 rounded border border-stone-700">
                      {fileName || "Photo ready for analysis"}
                    </div>
                    <span className="text-xs text-amber-300 font-semibold hover:text-amber-200 underline block mt-1.5">
                      Click to choose a different photo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5 py-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <UploadCloud size={28} />
                    </div>
                    <span className="text-sm font-bold text-white">
                      Drop study photo here or click to browse
                    </span>
                    <span className="text-xs text-stone-300 max-w-xs leading-normal">
                      Handwritten lecture pages, whiteboard sketches, graphs, diagrams, and proofs
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Analysis Mode Selector with High-Contrast Cards */}
            <div>
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
                Analysis Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {MODES.map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`p-3 rounded-xl text-left transition-all border ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/50"
                          : "bg-[#1d1916] border-stone-700 text-stone-300 hover:border-amber-400/50 hover:bg-[#25201c]"
                      }`}
                    >
                      <div className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-amber-400/90"}`}>
                        {m.label}
                      </div>
                      <div className="text-[11px] text-stone-300 line-clamp-2 mt-1 leading-tight">
                        {m.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific Prompt Input with High Contrast */}
            <div className="bg-[#fefce8] p-3.5 rounded-xl border-2 border-amber-400 shadow-md">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-1.5">
                Specific Question / Instruction (Optional)
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Verify the math in the second theorem, or decipher line 4..."
                className="w-full text-xs p-3 rounded-lg bg-white border border-stone-300 text-black placeholder:text-black font-semibold focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none resize-none shadow-sm"
              />
              <div className="text-xs font-bold text-black mt-1.5 flex items-center gap-1.5">
                <span className="text-amber-800 font-bold">💡</span>
                <span>e.g. Verify the math in the second theorem, or decipher line 4</span>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-200 bg-rose-950/80 p-3 rounded-xl border border-rose-500/50 font-medium">
                {error}
              </div>
            )}

            {/* Luminous, High-Contrast Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={busy || !imageBase64}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 text-stone-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing your notes…</span>
                </>
              ) : (
                <>
                  <Sparkles size={17} className="stroke-[2.5]" />
                  <span>Scan and Analyze Notes</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Analysis Results & Follow-up with Crisp Typography */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[420px] bg-[#1a1714] rounded-xl border border-stone-700 p-4 sm:p-5 overflow-hidden">
            {/* Result Header Bar */}
            <div className="flex items-center justify-between border-b border-stone-700/80 pb-3 mb-3">
              <span className="text-xs uppercase tracking-wider text-amber-300 font-bold flex items-center gap-2">
                <Sparkles size={15} className="text-amber-400" />
                <span>Summary & Extracted Notes</span>
              </span>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-stone-200 hover:text-white px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 font-medium transition-colors"
                    title="Copy full analysis"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    onClick={handleCreateNotebook}
                    className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-1.5 rounded-lg font-bold shadow-md shadow-amber-950/40 transition-colors"
                    title="Turn this analysis into a permanent study volume"
                  >
                    <BookOpen size={14} />
                    <span>Create Study Set</span>
                  </button>
                </div>
              )}
            </div>

            {/* Result Text Content Body */}
            <div className="flex-1 overflow-y-auto pr-1.5 text-stone-100 space-y-3 font-serif">
              {busy ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-300">
                  <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="font-serif text-xl font-bold text-white mb-1.5">
                    Analyzing your notes...
                  </p>
                  <p className="text-xs max-w-sm text-stone-300 font-sans leading-relaxed">
                    Reading handwriting, understanding diagrams, and extracting key points for your study set.
                  </p>
                </div>
              ) : result ? (
                <div className="space-y-4 leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-stone-950 text-sm">
                  <div className="bg-[#141210] p-4 rounded-xl border border-stone-800 text-stone-100 font-serif leading-relaxed text-[14.5px]">
                    {result}
                  </div>

                  {/* Follow-up Q&A conversation */}
                  {qHistory.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-stone-700 space-y-3 font-sans">
                      <div className="text-xs uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                        <MessageSquare size={14} />
                        <span>Interactive Photo Q&A</span>
                      </div>
                      {qHistory.map((item, idx) => (
                        <div key={idx} className="space-y-2 text-xs">
                          <div className="bg-[#241f1b] p-3 rounded-lg text-white font-medium border border-stone-700">
                            <span className="text-amber-400 font-bold">Q: </span>
                            {item.q}
                          </div>
                          <div className="bg-[#1c1815] p-3.5 rounded-lg text-stone-200 border-l-4 border-amber-400 pl-3.5 whitespace-pre-wrap font-serif text-sm leading-relaxed">
                            {item.a}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400 font-sans">
                  <div className="w-14 h-14 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center text-stone-400 mb-3">
                    <Camera size={30} />
                  </div>
                  <p className="text-base font-bold text-white mb-1">No image analyzed yet</p>
                  <p className="text-xs max-w-xs text-stone-300 leading-relaxed">
                    Upload a lecture note, equation sheet, or diagram photo on the left and click
                    &quot;Decipher Study Photo&quot;.
                  </p>
                </div>
              )}
            </div>

            {/* Follow-up Question Box */}
            {result && (
              <form onSubmit={handleAskFollowUp} className="mt-3.5 pt-3 border-t border-stone-700 flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about this photo (e.g. 'Explain step 2 in detail')..."
                  className="flex-1 text-xs p-2.5 rounded-xl bg-[#141210] border border-stone-700 text-white placeholder-stone-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none font-sans"
                  disabled={qBusy}
                />
                <button
                  type="submit"
                  disabled={qBusy || !question.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-md shadow-amber-950/30"
                >
                  {qBusy ? "..." : (
                    <>
                      <span>Ask</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
