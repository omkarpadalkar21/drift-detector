"""Generate a labeled synthetic dataset of config changes.

Because no public labeled dataset of "risky vs. safe configuration change"
exists (feasibility slide), we generate our own with ground truth labels:

  risky  — instantiated from templates per risk category, with value/file
           variation so it's not a copy of the rule regexes
  benign — realistic everyday config edits that must NOT be flagged

Output: dataset/changes.json  (list of {change, label, category})
Run:    python3 generate_dataset.py [--n 300] [--seed 42]
"""
import argparse
import json
import random
from pathlib import Path

FILES = {
    "k8s": ["k8s/deployment.yaml", "k8s/prod/api-deployment.yaml", "k8s/staging/web.yaml",
            "manifests/payment-service.yaml", "k8s/rbac.yaml"],
    "tf": ["terraform/security_group.tf", "terraform/prod/network.tf", "infra/iam.tf",
           "terraform/modules/db/main.tf"],
    "nginx": ["nginx/nginx.conf", "nginx/sites/api.conf", "config/nginx/prod.conf"],
    "ansible": ["ansible/playbook.yml", "ansible/roles/web/tasks/main.yml",
                "ansible/group_vars/all.yml"],
}


def f(kind):
    return random.choice(FILES[kind])


# ---------------------------------------------------------------- risky templates
# each: (category, file_kind, added_lines_fn, removed_lines_fn)
RISKY = [
    ("network_exposure", "tf", lambda: [f'  cidr_blocks = ["0.0.0.0/0"]'], lambda: []),
    ("network_exposure", "tf", lambda: [f"  from_port = 22", f"  to_port = 22"], lambda: []),
    ("network_exposure", "nginx", lambda: [f"listen 0.0.0.0:{random.choice([3306,5432,6379,27017])};"], lambda: []),
    ("network_exposure", "k8s", lambda: ["  type: NodePort", f"  nodePort: {random.randint(30000,32767)}"], lambda: []),
    ("network_exposure", "k8s", lambda: ["  hostNetwork: true"], lambda: []),
    ("network_exposure", "nginx", lambda: [], lambda: ['deny all;']),
    ("network_exposure", "tf", lambda: [], lambda: ['  default_action = "deny"']),
    ("secrets_auth", "ansible", lambda: [f'  db_password: "{random.choice(["Sup3rSecret!","hunter2pass","Pa55word2026"])}"'], lambda: []),
    ("secrets_auth", "tf", lambda: [f'  access_key = "AKIA{"".join(random.choices("ABCDEFGHIJKLMNOP0123456789", k=16))}"'], lambda: []),
    ("secrets_auth", "k8s", lambda: [f'  api_key: "{"".join(random.choices("abcdef0123456789", k=24))}"'], lambda: []),
    ("secrets_auth", "ansible", lambda: ["  auth_enabled: false"], lambda: []),
    ("secrets_auth", "nginx", lambda: ["auth_basic off;"], lambda: []),
    ("secrets_auth", "k8s", lambda: ['  - "--anonymous-auth=true"'], lambda: []),
    ("secrets_auth", "nginx", lambda: [f"debug = true"], lambda: []),
    ("insecure_protocols", "ansible", lambda: ["  validate_certs: no"], lambda: []),
    ("insecure_protocols", "k8s", lambda: ["  insecureSkipVerify: true"], lambda: []),
    ("insecure_protocols", "nginx", lambda: ["ssl_protocols TLSv1 TLSv1.1;"], lambda: []),
    ("insecure_protocols", "ansible", lambda: [f'  api_url: "http://internal-api.company.com/v1"'], lambda: []),
    ("insecure_protocols", "nginx", lambda: ["ssl_ciphers RC4-SHA:DES-CBC3-SHA;"], lambda: []),
    ("resource_limits", "k8s", lambda: [], lambda: ["  resources:", "    limits:", f'      memory: "{random.choice([256,512,1024])}Mi"']),
    ("resource_limits", "nginx", lambda: [], lambda: [f"max_connections = {random.choice([100,500,1000])}"]),
    ("resource_limits", "k8s", lambda: [f"  replicas: {random.choice([200,400,800])}"], lambda: []),
    ("access_control", "k8s", lambda: ["    privileged: true"], lambda: []),
    ("access_control", "k8s", lambda: ["    runAsUser: 0"], lambda: []),
    ("access_control", "k8s", lambda: ['  verbs: ["*"]', '  resources: ["*"]'], lambda: []),
    ("access_control", "tf", lambda: ['      "Action": "*",', '      "Resource": "*"'], lambda: []),
    ("access_control", "ansible", lambda: [f"  mode: '0777'"], lambda: []),
    ("access_control", "k8s", lambda: ["  allowPrivilegeEscalation: true"], lambda: []),
]

# ---------------------------------------------------------------- benign templates
BENIGN = [
    ("k8s", lambda: [f"  image: nginx:1.{random.randint(20,29)}.{random.randint(0,5)}"], lambda: [f"  image: nginx:1.19.0"]),
    ("k8s", lambda: [f"  replicas: {random.randint(2,8)}"], lambda: [f"  replicas: {random.randint(2,8)}"]),
    ("k8s", lambda: [f'  app.kubernetes.io/version: "{random.randint(1,9)}.{random.randint(0,9)}"'], lambda: []),
    ("k8s", lambda: [f'      memory: "{random.choice([512,1024,2048])}Mi"'], lambda: [f'      memory: "256Mi"']),
    ("k8s", lambda: ["  runAsNonRoot: true", "  readOnlyRootFilesystem: true"], lambda: []),
    ("nginx", lambda: [f"worker_connections {random.choice([1024,2048,4096])};"], lambda: []),
    ("nginx", lambda: [f"gzip_types text/css application/json;"], lambda: []),
    ("nginx", lambda: [f"# rotated logs weekly per ops request"], lambda: []),
    ("nginx", lambda: ["ssl_protocols TLSv1.2 TLSv1.3;"], lambda: ["ssl_protocols TLSv1.2;"]),
    ("tf", lambda: [f'  instance_type = "{random.choice(["t3.medium","t3.large","m5.large"])}"'], lambda: ['  instance_type = "t3.small"']),
    ("tf", lambda: [f'  tags = {{ Team = "{random.choice(["platform","payments","web"])}" }}'], lambda: []),
    ("tf", lambda: ['  monitoring = true'], lambda: []),
    ("ansible", lambda: [f"  timeout: {random.choice([30,60,120])}"], lambda: [f"  timeout: 300"]),
    ("ansible", lambda: [f'  ntp_server: "pool.ntp.org"'], lambda: []),
    ("ansible", lambda: [f'  log_level: "info"'], lambda: [f'  log_level: "warn"']),
    ("k8s", lambda: [f"    periodSeconds: {random.choice([5,10,15])}"], lambda: []),
]

AUTHORS = ["asha", "rohan", "priya", "kabir"]


def make_change(idx, dates):
    if random.random() < 0.45:
        cat, kind, add, rem = random.choice(RISKY)
        label = "risky"
    else:
        kind, add, rem = random.choice(BENIGN)
        cat, label = "none", "benign"
    return {
        "change": {
            "file_path": f(kind),
            "commit_hash": f"{random.getrandbits(28):07x}",
            "commit_date": dates[idx],
            "author": random.choice(AUTHORS),
            "added_lines": add(),
            "removed_lines": rem(),
        },
        "label": label,
        "category": cat,
    }


def main(n, seed):
    random.seed(seed)
    # spread commits across 18 months, chronological
    dates = sorted(
        f"202{random.choice([5,5,5,6])}-{random.randint(1,12):02d}-"
        f"{random.randint(1,28):02d}T{random.randint(8,19):02d}:{random.randint(0,59):02d}:00Z"
        for _ in range(n))
    data = [make_change(i, dates) for i in range(n)]
    out = Path("dataset"); out.mkdir(exist_ok=True)
    (out / "changes.json").write_text(json.dumps(data, indent=1))
    risky = sum(d["label"] == "risky" for d in data)
    print(f"wrote dataset/changes.json — {n} changes ({risky} risky, {n - risky} benign)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=300)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    main(a.n, a.seed)
