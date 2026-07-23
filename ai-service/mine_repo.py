"""Reference Git miner — walks a repo's history and emits changes[] in the
frozen JSON contract. Hand this to whoever owns the Git Miner component.

Run:  python3 mine_repo.py <path-or-url> > changes.json
Then: curl -X POST localhost:8001/analyze -H 'Content-Type: application/json' \
           -d "{\"repo_id\": \"demo\", \"changes\": $(cat changes.json)}"
"""
import json
import sys
import tempfile

import git

CONFIG_EXTS = (".yaml", ".yml", ".conf", ".tf", ".toml", ".ini", ".cfg", ".json")


def mine(repo_path: str) -> list[dict]:
    if repo_path.startswith(("http://", "https://", "git@")):
        tmp = tempfile.mkdtemp()
        repo = git.Repo.clone_from(repo_path, tmp)
    else:
        repo = git.Repo(repo_path)

    commits = list(repo.iter_commits(repo.active_branch))[::-1]  # oldest first
    changes = []
    for prev, cur in zip(commits, commits[1:]):
        for d in prev.diff(cur, create_patch=True):
            path = d.b_path or d.a_path
            if not path or not path.endswith(CONFIG_EXTS):
                continue
            added, removed = [], []
            for line in d.diff.decode(errors="ignore").splitlines():
                if line.startswith("+") and not line.startswith("+++"):
                    added.append(line[1:])
                elif line.startswith("-") and not line.startswith("---"):
                    removed.append(line[1:])
            if added or removed:
                changes.append({
                    "file_path": path,
                    "commit_hash": cur.hexsha[:7],
                    "commit_date": cur.committed_datetime.isoformat(),
                    "author": cur.author.name,
                    "added_lines": added,
                    "removed_lines": removed,
                })
    return changes


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "synthetic-infra-repo"
    print(json.dumps(mine(target), indent=1))
