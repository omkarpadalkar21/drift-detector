# Drift Detector — AI/ML Analysis Service

FastAPI service implementing Layers 1–4 of the Configuration Drift Detector:
deterministic rule engine → embeddings + FAISS semantic layer → 40/30/30
weighted risk scoring → templated explanations (optional LLM rewrite later).

## Run it

```bash
pip install -r requirements.txt        # first run downloads all-MiniLM-L6-v2 (~90 MB)
uvicorn app.main:app --reload --port 8001
# interactive docs: http://localhost:8001/docs
```

Works even without `sentence-transformers`/`faiss-cpu` installed — it
auto-falls back to a hashing-ngram embedder + numpy cosine search and reports
which backend is live in `/health` and `engine_info`. Install the full stack
on your laptop for the real "catching the unseen" behaviour.

```bash
python3 -m pytest test_service.py -q   # 8 tests
curl -s -X POST localhost:8001/analyze -H 'Content-Type: application/json' \
     -d @demo_payload.json | python3 -m json.tool
```

`demo_payload.json` reproduces the 18-month drift story from the Round 1
deck (debug enabled → limits removed → SSH opened → deny rule deleted →
0.0.0.0/0 added) and returns drift_score ≈ 75 with a rising trend.

## Frozen JSON contract (backend ⇄ AI service)

**POST /analyze**

```jsonc
// request
{
  "repo_id": "infra-prod",
  "changes": [{
    "file_path": "k8s/deployment.yaml",
    "commit_hash": "9d4c771",
    "commit_date": "2025-06-15T09:12:00Z",   // ISO-8601, drives the trend chart
    "author": "dev-b",
    "added_lines": ["..."],
    "removed_lines": ["..."]
  }]
}

// response
{
  "repo_id": "...",
  "drift_score": 75.2,                        // 0-100, repo-level
  "risk_trend": [{"date": "...", "cumulative_drift": 18.4}, ...],
  "summary": {"CRITICAL": 1, "HIGH": 2, ...},
  "analyzed_changes": 6,
  "engine_info": {...},
  "findings": [{
    "file_path": "...", "commit_hash": "...", "commit_date": "...",
    "severity": "CRITICAL",                   // CRITICAL|HIGH|MEDIUM|LOW
    "risk_score": 74.1, "confidence": 0.85,
    "rule_id": "NET-002",                     // null when semantic-only
    "rule_name": "...", "category": "network_exposure",
    "evidence": ["  from_port = 22"],         // exact triggering lines
    "matched_by": "rule",                     // rule | semantic | rule+semantic
    "nearest_pattern": "...", "similarity": 0.59,   // null when rule-only
    "explanation": "...", "remediation": "..."
  }]
}
```

The Git miner's job is to produce `changes[]`; the frontend's job is to
render `findings`, `drift_score`, and `risk_trend`. Nothing else crosses
the boundary.

## Layout

```
app/rules.json          15 rules across 5 domains (network exposure,
                        secrets/auth, insecure protocols, resource limits,
                        access control)
app/seed_patterns.json  25 known-risky patterns seeding the FAISS index
app/rule_engine.py      Layer 1 — deterministic, never cut
app/semantic.py         Layer 2 — MiniLM + FAISS, with automatic fallback
app/scoring.py          Layer 3 — 40/30/30 score, drift score, trend
app/explain.py          Layer 4 — explanations (LLM hook optional)
app/main.py             /analyze and /health
```

## Extending

* New rule → append to `rules.json` (id, category, severity, base_score,
  applies_to added/removed, regex patterns, remediation). No code change.
* New seed pattern → append to `seed_patterns.json`. Index rebuilds on boot.
* Similarity threshold lives in `SemanticMatcher.THRESHOLD` (0.45).

## Synthetic data 

```bash
python3 generate_dataset.py --n 300   # labeled risky/benign changes + ground truth
python3 evaluate.py                   # precision / recall / F1 against labels
python3 generate_repo.py              # real Git repo, 14 backdated commits, 18 months of drift
python3 mine_repo.py synthetic-infra-repo   # walk it -> changes[] in the contract
```

Current metrics on the 300-change dataset (fallback embedder, no ML model
installed): precision 1.000, recall 0.956, F1 0.977. Remaining misses are
phrasings only the full semantic layer (MiniLM) covers — install
requirements.txt and re-run evaluate.py to report final numbers.
