export interface KeyConcept {
  name: string;
  explanation: string;
}

export interface Definition {
  term: string;
  definition: string;
}

export interface Formula {
  name: string;
  formula: string;
  note?: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface MCQ {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface PlanDay {
  day: number;
  focus: string;
  tasks: string[];
}

export interface StudyPack {
  title: string;
  summary: string;
  key_concepts: KeyConcept[];
  definitions: Definition[];
  formulas: Formula[];
  flashcards: Flashcard[];
  mcqs: MCQ[];
  revision_plan: PlanDay[];
}

export interface StudySetSummary {
  id: string;
  title: string;
  subject: string;
  source_type: "text" | "pdf" | "youtube" | "image";
  created_at: string;
  counts: {
    flashcards: number;
    mcqs: number;
  };
}

export interface StudySetDetail extends StudySetSummary {
  pack: StudyPack;
  prefs: {
    num_mcqs?: number;
    num_flashcards?: number;
    difficulty?: string;
    exam_date?: string;
    truncated?: boolean;
    fallback?: boolean;
    notice?: string;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  modelUsed?: string;
  roleUsed?: string;
}

export type TutorRole = "tutor" | "deep_solver" | "fast_review" | "socratic";

export interface ImageAnalysisResult {
  analysis: string;
  model: string;
  analysis_type: string;
}
