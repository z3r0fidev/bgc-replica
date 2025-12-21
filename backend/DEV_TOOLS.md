# Backend Developer Tools Guide

This guide outlines the implementation of essential developer tools for the FastAPI backend to ensure high performance, security, and code quality.

## 1. Ruff & Mypy (Linting, Formatting & Typing)
Ruff is an extremely fast Python linter and formatter, replacing Flake8, Black, and isort.

### Installation
```bash
pip install ruff mypy
```

### Configuration
Create `pyproject.toml` if it doesn't exist:
```toml
[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "ASYNC"]

[tool.mypy]
plugins = ["pydantic.mypy"]
ignore_missing_imports = true
strict = true
```

---

## 2. Bandit (Security Auditing)
Find common security issues in Python code (e.g., hardcoded passwords, insecure imports).

### Installation
```bash
pip install bandit
```

### Usage
Run a recursive scan:
```bash
bandit -r app/
```

---

## 3. Scalene (Performance Profiling)
A high-performance CPU, memory, and GPU profiler for Python.

### Installation
```bash
pip install scalene
```

### Usage
Profile your FastAPI app:
```bash
scalene app/main.py
```
*Note: This will provide line-level performance and memory consumption details.*

---

## 4. py-spy (Production Profiling)
A sampling profiler that can attach to a running process without restarting it.

### Installation
```bash
pip install py-spy
```

### Usage
Generate a flame graph for a running Uvicorn process:
```bash
# Find PID
ps aux | grep uvicorn
# Record
sudo py-spy record -o profile.svg --pid <PID>
```

---

## 5. Pre-commit Hooks
Automate backend checks before commits.

### Installation
```bash
pip install pre-commit
```

### Configuration
Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.5.1
    hooks:
      - id: mypy
        additional_dependencies: [pydantic, sqlalchemy]
```
Run `pre-commit install` to activate.
