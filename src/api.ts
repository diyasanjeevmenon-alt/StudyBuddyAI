import { StudySetDetail, StudySetSummary, TutorRole, ImageAnalysisResult } from "./types";

export interface GeneratePayload {
  source_type: string;
  text?: string;
  pdf_base64?: string;
  image_base64?: string;
  image_mime?: string;
  youtube_url?: string;
  subject?: string;
  num_mcqs?: number;
  num_flashcards?: number;
  difficulty?: string;
  exam_date?: string;
}

const BASE = (import.meta as any).env?.VITE_API_BASE || "";

function clientId(): string {
  let id = localStorage.getItem("sb_client");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sb_client", id);
  }
  return id;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "X-Client-Id": clientId(),
      },
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection, or wait a moment if the app is waking up (free hosting sleeps when idle).");
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    if (contentType.includes("application/json")) {
      try {
        const body = await res.json();
        if (typeof body.detail === "string") message = body.detail;
        else if (Array.isArray(body.detail)) message = "Some of the details you entered aren't valid.";
      } catch {
        /* keep default */
      }
    } else {
      message = `Server responded with status ${res.status}. Please try again.`;
    }
    throw new Error(message);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned an unexpected format. Please retry generating your study guide.");
  }

  return res;
}

export const warmUp = () => fetch(BASE + "/api/health").catch(() => {});
export const listSets = async (): Promise<StudySetSummary[]> => (await request("/api/sets")).json();
export const getSet = async (id: string): Promise<StudySetDetail> => (await request(`/api/sets/${id}`)).json();
export const deleteSet = async (id: string): Promise<{ ok: boolean }> =>
  (await request(`/api/sets/${id}`, { method: "DELETE" })).json();

export const generate = async (formDataOrObj: FormData | any): Promise<StudySetDetail> => {
  const isFormData = typeof FormData !== "undefined" && formDataOrObj instanceof FormData;
  const options: RequestInit = {
    method: "POST",
    body: isFormData ? formDataOrObj : JSON.stringify(formDataOrObj),
  };
  if (!isFormData) {
    options.headers = { "Content-Type": "application/json" };
  }
  const res = await request("/api/generate", options);
  return res.json();
};

export const chat = async (
  setId: string | null,
  message: string,
  history: Array<{ role: "user" | "assistant"; text: string }>,
  role: TutorRole = "tutor"
): Promise<{ reply: string; model: string; role: string }> => {
  const res = await request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ set_id: setId, message, history, role }),
  });
  return res.json();
};

export const analyzeImage = async (
  imageBase64: string,
  mimeType: string,
  prompt: string,
  analysisType: string = "general"
): Promise<ImageAnalysisResult> => {
  const res = await request("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: imageBase64,
      mime_type: mimeType,
      prompt,
      analysis_type: analysisType,
    }),
  });
  return res.json();
};

export async function downloadPdf(setId: string, title: string) {
  const res = await request(`/api/sets/${setId}/pdf`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "study-pack"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
