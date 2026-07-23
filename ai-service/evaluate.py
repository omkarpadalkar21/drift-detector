"""Evaluate the detector against the labeled synthetic dataset.

Feeds every change through the same pipeline as /analyze and compares the
prediction (flagged or not) against ground truth.

Run:  python3 generate_dataset.py && python3 evaluate.py
"""
import json
from collections import defaultdict

from app.rule_engine import RuleEngine
from app.semantic import SemanticMatcher, EMBEDDER

engine = RuleEngine()
matcher = SemanticMatcher()


def predict(ch):
    """True if the pipeline would flag this change."""
    if engine.evaluate(ch["added_lines"], ch["removed_lines"]):
        return True
    pattern, _ = matcher.nearest(ch["file_path"], ch["added_lines"], ch["removed_lines"])
    return pattern is not None


def main():
    data = json.load(open("dataset/changes.json"))
    tp = fp = tn = fn = 0
    misses = defaultdict(int)
    false_alarms = []

    for d in data:
        flagged = predict(d["change"])
        risky = d["label"] == "risky"
        if flagged and risky:
            tp += 1
        elif flagged and not risky:
            fp += 1
            false_alarms.append(d["change"])
        elif not flagged and risky:
            fn += 1
            misses[d["category"]] += 1
        else:
            tn += 1

    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0

    print(f"embedder: {EMBEDDER}")
    print(f"n={len(data)}  TP={tp} FP={fp} FN={fn} TN={tn}")
    print(f"precision={prec:.3f}  recall={rec:.3f}  f1={f1:.3f}")
    if misses:
        print("missed risky by category:", dict(misses))
    for ch in false_alarms[:5]:
        print("FALSE ALARM:", ch["file_path"], ch["added_lines"] or ch["removed_lines"])


if __name__ == "__main__":
    main()
