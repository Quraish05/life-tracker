/**
 * Journal RAG types — "Ask my journal" question answering.
 * The answer is grounded in the user's entries; citations point back to them.
 */

/** A journal entry the answer drew from — rendered as a clickable source chip. */
export type JournalCitation = {
  note_id: number;
  entry_date: string | null;
  title: string;
  snippet: string;
};

export type AskJournalResponse = {
  answer: string;
  citations: JournalCitation[];
  /** Which model produced the answer — surfaced for transparency. */
  model: string;
};

/**
 * A saved "Ask my journal" answer — a *finding* on the Patterns page. The answer
 * is the claim, the citations are its evidence (a snapshot taken when saved), and
 * `helpful` is the "was this true for you?" vote (null = unanswered).
 */
export type JournalInsight = {
  id: number;
  question: string;
  answer: string;
  citations: JournalCitation[];
  model: string | null;
  helpful: boolean | null;
  created_at: string;
};

/** Payload to save an answer — the RAG response plus the question that produced it. */
export type SaveInsightPayload = {
  question: string;
  answer: string;
  citations: JournalCitation[];
  model: string | null;
};
