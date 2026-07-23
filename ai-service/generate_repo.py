"""Build a real Git repository with 18 months of synthetic config drift.

Creates ./synthetic-infra-repo with genuine backdated commits: mostly
benign edits, with the deck's drift story (debug -> limits -> SSH ->
deny removed -> 0.0.0.0/0) woven in chronologically. Give this to the
Git miner to walk, and to the panel as the demo target.

Run:  python3 generate_repo.py
"""
import os
import random
import subprocess
from pathlib import Path

REPO = Path("synthetic-infra-repo")
AUTHORS = [("Asha", "asha@team.dev"), ("Rohan", "rohan@team.dev"),
           ("Priya", "priya@team.dev"), ("Kabir", "kabir@team.dev")]

BASELINE = {
    "nginx/nginx.conf": """worker_processes 4;
events { worker_connections 1024; }
http {
  server {
    listen 127.0.0.1:8080;
    ssl_protocols TLSv1.2 TLSv1.3;
    location /admin { deny all; }
  }
}
""",
    "k8s/deployment.yaml": """apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: api:1.0.0
        securityContext:
          runAsNonRoot: true
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
""",
    "terraform/security_group.tf": """resource "aws_security_group" "api" {
  name = "api-sg"
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  default_action = "deny"
}
""",
    "ansible/playbook.yml": """- hosts: web
  vars:
    log_level: "warn"
    validate_certs: yes
    auth_enabled: true
  tasks:
    - name: deploy config
      template: src=app.conf.j2 dest=/etc/app.conf mode='0640'
""",
}

# (date, author_idx, message, file, old_text, new_text)  — None old = append
EVENTS = [
    ("2025-01-10T09:00:00", 0, "initial locked-down baseline", None, None, None),
    ("2025-02-03T11:15:00", 1, "bump api image", "k8s/deployment.yaml", "image: api:1.0.0", "image: api:1.1.0"),
    ("2025-03-02T14:30:00", 0, "enable debug for incident 4821", "nginx/nginx.conf", "listen 127.0.0.1:8080;", "listen 127.0.0.1:8080;\n    debug = true;"),
    ("2025-03-20T10:05:00", 2, "tune worker connections", "nginx/nginx.conf", "worker_connections 1024;", "worker_connections 2048;"),
    ("2025-04-14T16:40:00", 3, "add team tags", "terraform/security_group.tf", 'name = "api-sg"', 'name = "api-sg"\n  tags = { Team = "platform" }'),
    ("2025-06-15T09:12:00", 1, "scale for launch, drop mem cap", "k8s/deployment.yaml", '  replicas: 3', '  replicas: 400'),
    ("2025-06-15T09:14:00", 1, "remove limits blocking rollout", "k8s/deployment.yaml", '        resources:\n          limits:\n            memory: "512Mi"\n            cpu: "500m"\n', ''),
    ("2025-07-08T12:00:00", 2, "raise log level", "ansible/playbook.yml", 'log_level: "warn"', 'log_level: "info"'),
    ("2025-09-21T16:45:00", 2, "temp ssh for vendor debugging", "terraform/security_group.tf", "  ingress {", "  ingress {\n    from_port = 22\n    to_port   = 22\n    protocol  = \"tcp\"\n  }\n  ingress {"),
    ("2025-10-30T10:20:00", 0, "bump api image", "k8s/deployment.yaml", "image: api:1.1.0", "image: api:1.2.3"),
    ("2025-12-08T14:03:00", 3, "unblock partner integration", "terraform/security_group.tf", '  default_action = "deny"\n', ''),
    ("2026-01-19T09:30:00", 1, "quieter healthcheck logs", "nginx/nginx.conf", "gzip off;", None),
    ("2026-02-11T15:10:00", 0, "skip cert check for internal mirror", "ansible/playbook.yml", "validate_certs: yes", "validate_certs: no"),
    ("2026-04-19T10:20:00", 3, "open api for demo day", "terraform/security_group.tf", 'cidr_blocks = ["10.0.0.0/8"]', 'cidr_blocks = ["0.0.0.0/0"]'),
    ("2026-05-30T18:55:00", 1, "expose admin panel per sales req", "nginx/nginx.conf", "location /admin { deny all; }", "location /admin { allow all; }"),
]


def git(args, date=None, author=None):
    env = os.environ.copy()
    if date:
        env["GIT_AUTHOR_DATE"] = env["GIT_COMMITTER_DATE"] = date
    if author:
        env["GIT_AUTHOR_NAME"], env["GIT_AUTHOR_EMAIL"] = author
        env["GIT_COMMITTER_NAME"], env["GIT_COMMITTER_EMAIL"] = author
    subprocess.run(["git"] + args, cwd=REPO, env=env, check=True,
                   capture_output=True)


def main():
    if REPO.exists():
        raise SystemExit(f"{REPO} already exists — delete it first")
    REPO.mkdir()
    git(["init", "-q", "-b", "main"])

    for date, ai, msg, file, old, new in EVENTS:
        if file is None:  # baseline commit
            for path, content in BASELINE.items():
                p = REPO / path
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(content)
        else:
            p = REPO / file
            text = p.read_text()
            if new is None:            # skip events that don't apply cleanly
                if old not in text:
                    continue
                text = text  # no-op guard; real edits below
            if old is not None and old in text:
                p.write_text(text.replace(old, new if new is not None else ""))
            else:
                continue
        git(["add", "-A"])
        git(["commit", "-q", "-m", msg], date=date, author=AUTHORS[ai])

    n = subprocess.run(["git", "log", "--oneline"], cwd=REPO,
                       capture_output=True, text=True).stdout.count("\n")
    print(f"built {REPO}/ with {n} backdated commits (Jan 2025 -> May 2026)")


if __name__ == "__main__":
    random.seed(7)
    main()
