"""Local sentence embeddings for semantic retrieval (RAG).

Uses a small, free, offline sentence-transformers model (``all-MiniLM-L6-v2``,
384 dims). No API key and no network after the one-time model download — a
deliberate contrast with ``ai_client`` (the Anthropic/Gemini *API* plumbing):
embeddings are local CPU work, answer generation is a remote API call.

The model load is expensive and pulls in torch, so it's lazily constructed once
and cached, and the heavy import is deferred until the first embed. Encoding is
blocking CPU work, so callers await it on a worker thread to keep the event loop
responsive.
"""

import asyncio
from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

EMBED_MODEL = "all-MiniLM-L6-v2"
# Output dimension of EMBED_MODEL. Must match the Vector(...) column in
# app/models/note_chunk.py and the migration.
EMBED_DIMENSIONS = 384


@lru_cache(maxsize=1)
def _model() -> "SentenceTransformer":
    """Load the embedding model once (first call downloads/caches the weights).

    Imported lazily so that merely importing this module — or the routes that
    depend on it — doesn't drag in torch at startup or in tests that fake embeds.
    """
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(EMBED_MODEL)


def _encode(texts: list[str]) -> list[list[float]]:
    # normalize_embeddings=True → unit-length vectors, so cosine distance is
    # well-behaved and dense scores are directly comparable.
    vectors = _model().encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts → one 384-dim unit vector each (order preserved)."""
    if not texts:
        return []
    return await asyncio.to_thread(_encode, texts)


async def embed_query(text: str) -> list[float]:
    """Embed a single query string → its 384-dim unit vector."""
    (vector,) = await embed_texts([text])
    return vector
