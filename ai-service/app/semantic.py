"""Semantic layer — Layer 2.

Embeds each config change and searches the seed-pattern index for the
nearest known-risky pattern. Uses sentence-transformers (all-MiniLM-L6-v2)
+ faiss-cpu when installed. If either is missing, falls back to a
deterministic character-ngram hashing embedder + numpy cosine search, so
the whole service still runs end-to-end on any machine (and in CI).

The fallback is weaker semantically but keeps the contract identical —
swap happens automatically at import time and is reported in engine_info.
"""
import hashlib
import json
import re
from pathlib import Path

import numpy as np

SEEDS_PATH = Path(__file__).parent / "seed_patterns.json"

# ---------------------------------------------------------------- embedders
try:
    from sentence_transformers import SentenceTransformer

    _model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(texts: list[str]) -> np.ndarray:
        vecs = _model.encode(texts, normalize_embeddings=True)
        return np.asarray(vecs, dtype="float32")

    EMBEDDER = "sentence-transformers/all-MiniLM-L6-v2"
except Exception:  # not installed / no cached weights
    _DIM = 512

    def _tokens(text: str):
        text = text.lower()
        words = re.findall(r"[a-z0-9_.\-/]+", text)
        toks = list(words)
        for w in words:                       # char trigrams generalize typos/variants
            toks += [w[i:i + 3] for i in range(len(w) - 2)]
        return toks

    def embed(texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), _DIM), dtype="float32")
        for i, t in enumerate(texts):
            for tok in _tokens(t):
                h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
                out[i, h % _DIM] += 1.0 if (h >> 8) % 2 else -1.0
            n = np.linalg.norm(out[i])
            if n > 0:
                out[i] /= n
        return out

    EMBEDDER = "fallback/hashing-ngram (install sentence-transformers for full quality)"

# ---------------------------------------------------------------- index
try:
    import faiss

    class _Index:
        def __init__(self, vecs: np.ndarray):
            self.ix = faiss.IndexFlatIP(vecs.shape[1])  # cosine (vectors normalized)
            self.ix.add(vecs)

        def search(self, q: np.ndarray, k: int = 1):
            sims, ids = self.ix.search(q, k)
            return sims, ids

    INDEX_BACKEND = "faiss-cpu"
except Exception:

    class _Index:
        def __init__(self, vecs: np.ndarray):
            self.vecs = vecs

        def search(self, q: np.ndarray, k: int = 1):
            sims_full = q @ self.vecs.T
            ids = np.argsort(-sims_full, axis=1)[:, :k]
            sims = np.take_along_axis(sims_full, ids, axis=1)
            return sims, ids

    INDEX_BACKEND = "numpy-cosine (install faiss-cpu for scale)"


class SemanticMatcher:
    # Below this similarity a match is noise, not signal.
    THRESHOLD = 0.5

    def __init__(self, seeds_path: Path = SEEDS_PATH):
        raw = json.loads(seeds_path.read_text())
        self.patterns = raw["patterns"]
        self.index = _Index(embed([p["text"] for p in self.patterns]))

    @staticmethod
    def change_to_text(file_path: str, added: list[str], removed: list[str]) -> str:
        """Verbalize a diff so it lives in the same space as seed patterns."""
        parts = [f"config change in {file_path}."]
        if added:
            parts.append("added: " + " ; ".join(l.strip() for l in added if l.strip()))
        if removed:
            parts.append("removed: " + " ; ".join(l.strip() for l in removed if l.strip()))
        return " ".join(parts)[:1000]

    def nearest(self, file_path: str, added: list[str], removed: list[str]):
        """Return (pattern_dict, similarity) or (None, 0.0)."""
        q = embed([self.change_to_text(file_path, added, removed)])
        sims, ids = self.index.search(q, k=1)
        sim = float(sims[0][0])
        if sim < self.THRESHOLD:
            return None, sim
        return self.patterns[int(ids[0][0])], sim
