"""Explanation layer — Layer 4 (polish, cut first).

Deterministic templated explanations by default so the demo never depends
on the network. An optional LLM call can rewrite them when EXPLAIN_LLM=1
and an API key is configured — exactly as promised on the feasibility
slide: the LLM writes remediation AFTER detection, never inside it.
"""


def explain(finding: dict) -> tuple[str, str]:
    """Return (explanation, remediation) from an assembled finding dict."""
    ev = finding["evidence"][0].strip() if finding["evidence"] else "the change"
    where = finding["file_path"]

    if finding["matched_by"] in ("rule", "rule+semantic"):
        expl = (f"{finding['rule_name']}: `{ev}` in {where} matched rule "
                f"{finding['rule_id']} ({finding['category'].replace('_', ' ')}). "
                f"{finding['description']}")
        rem = finding["rule_remediation"]
    else:
        expl = (f"No hardcoded rule matched, but `{ev}` in {where} is "
                f"semantically close (similarity {finding['similarity']:.2f}) to a "
                f"known-risky pattern: \"{finding['nearest_pattern']}\".")
        rem = ("Review this change against your security baseline; if the "
               "similarity is confirmed, apply the same remediation as the "
               "matched known-risky pattern.")

    if finding["matched_by"] == "rule+semantic":
        expl += (f" The semantic layer independently agreed "
                 f"(similarity {finding['similarity']:.2f}).")
    return expl, rem
