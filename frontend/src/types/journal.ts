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
