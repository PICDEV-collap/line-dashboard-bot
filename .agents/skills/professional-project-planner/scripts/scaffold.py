#!/usr/bin/env python3
"""
Scaffold & Security Helper CLI for professional-project-planner skill.
Provides automation for project scaffolding and pre-commit security audits.
"""

import os
import sys
import re
import json
import argparse
import shutil
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# Common regex patterns for secret detection
SECRET_PATTERNS = [
    (r'(?i)(?:api_key|apikey|secret|token|password|auth_token|access_token)\s*[:=]\s*["\']([a-zA-Z0-9_\-\.\/+=]{16,})["\']', "Potential Hardcoded Secret/Token"),
    (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', "Private Key Detected"),
    (r'ghp_[a-zA-Z0-9]{36}', "GitHub Personal Access Token"),
    (r'xox[baprs]-[0-9a-zA-Z]{10,48}', "Slack Token"),
    (r'(?i)postgres(?:ql)?://[a-zA-Z0-9_]+:[a-zA-Z0-9_@\.-]+@[a-zA-Z0-9_\.-]+:[0-9]+/[a-zA-Z0-9_\.-]+', "Database Connection String with Password"),
    (r'(?i)eval\s*\(', "Potentially Insecure eval() Call"),
    (r'(?i)child_process\.exec\s*\(', "Potentially Unsafe Shell Execution")
]

IGNORE_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", ".venv", "venv",
    "__pycache__", ".agents", ".claude", ".gemini"
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".mp4", ".zip", ".tar", ".gz", ".lock", ".tsbuildinfo"
}

def init_docs(args):
    """Scaffold standard planning and architecture documents into the target directory."""
    target_dir = Path(args.target_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    
    project_name = args.project_name or target_dir.parent.name or "MyProject"
    
    files_to_copy = [
        ("architecture_spec_template.md", "architecture_spec.md"),
        ("implementation_plan_template.md", "implementation_plan.md"),
        ("security_review_checklist.md", "security_review.md")
    ]
    
    results = {
        "status": "success",
        "target_directory": str(target_dir),
        "project_name": project_name,
        "scaffolded_files": []
    }
    
    for template_filename, target_filename in files_to_copy:
        src = TEMPLATES_DIR / template_filename
        dest = target_dir / target_filename
        
        if not src.exists():
            print(f"Warning: Template {template_filename} not found at {src}", file=sys.stderr)
            continue
            
        content = src.read_text(encoding="utf-8")
        content = content.replace("[Project Name]", project_name)
        content = content.replace("[Feature / Milestone Name]", f"{project_name} Initial Milestone")
        
        if dest.exists() and not args.overwrite:
            results["scaffolded_files"].append({
                "file": str(dest),
                "action": "skipped (already exists)"
            })
        else:
            dest.write_text(content, encoding="utf-8")
            results["scaffolded_files"].append({
                "file": str(dest),
                "action": "created" if not dest.exists() else "overwritten"
            })

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    
    print(f"Success! Project scaffolding completed. Results written to: {output_path}")
    return 0

def check_security(args):
    """Scan target directory for exposed secrets and dangerous code patterns."""
    target_dir = Path(args.target_dir).resolve()
    if not target_dir.exists():
        print(f"Error: Target directory {target_dir} does not exist.", file=sys.stderr)
        return 1

    findings = []
    files_scanned = 0
    compiled_patterns = [(re.compile(pat), desc) for pat, desc in SECRET_PATTERNS]

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix.lower() in IGNORE_EXTENSIONS:
                continue
            if file.startswith(".env") and not file.endswith(".example"):
                findings.append({
                    "file": str(file_path.relative_to(target_dir)),
                    "line": 1,
                    "severity": "High",
                    "issue": "Sensitive .env file tracked in scanned tree"
                })
                continue

            files_scanned += 1
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for line_idx, line in enumerate(content.splitlines(), start=1):
                    # Skip common test fixtures, dummy tokens, or mock data lines
                    if "mock" in line.lower() or "example" in line.lower() or "test" in line.lower() or "dummy" in line.lower():
                        continue
                        
                    for pat, desc in compiled_patterns:
                        if pat.search(line):
                            findings.append({
                                "file": str(file_path.relative_to(target_dir)),
                                "line": line_idx,
                                "severity": "High" if "key" in desc.lower() or "secret" in desc.lower() else "Medium",
                                "issue": desc,
                                "snippet": line.strip()[:100]
                            })
            except Exception as e:
                pass

    critical_or_high = [f for f in findings if f["severity"] == "High"]
    
    report = {
        "status": "warning" if findings else "clean",
        "target_directory": str(target_dir),
        "files_scanned": files_scanned,
        "total_findings": len(findings),
        "high_severity_findings": len(critical_or_high),
        "findings": findings
    }

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Scan complete. Files scanned: {files_scanned}, Findings: {len(findings)}. Report written to: {output_path}")

    if args.fail_on_critical and critical_or_high:
        print(f"Error: {len(critical_or_high)} High/Critical findings detected!", file=sys.stderr)
        return 1
        
    return 0

def main():
    parser = argparse.ArgumentParser(
        description="Professional Project Planner - Scaffolding & Security CLI"
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Subcommand: init
    init_parser = subparsers.add_parser("init", help="Scaffold standard documentation and templates")
    init_parser.add_argument("--target-dir", default="./docs", help="Target directory for documentation (default: ./docs)")
    init_parser.add_argument("--project-name", default="", help="Project Name")
    init_parser.add_argument("--overwrite", action="store_true", help="Overwrite existing files if present")
    init_parser.add_argument("--output", required=True, help="Path to write JSON execution results (required)")

    # Subcommand: check-security
    sec_parser = subparsers.add_parser("check-security", help="Run static security scan for secrets and unsafe patterns")
    sec_parser.add_argument("--target-dir", default=".", help="Target directory to scan (default: .)")
    sec_parser.add_argument("--fail-on-critical", action="store_true", help="Exit with code 1 if High/Critical issues found")
    sec_parser.add_argument("--output", required=True, help="Path to write JSON security report (required)")

    args = parser.parse_args()

    if args.subcommand == "init":
        sys.exit(init_docs(args))
    elif args.subcommand == "check-security":
        sys.exit(check_security(args))
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
