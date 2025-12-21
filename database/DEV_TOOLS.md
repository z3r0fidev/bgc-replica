# Database Developer Tools Guide

This guide outlines tools for visualizing, managing, and optimizing the PostgreSQL (SQLAlchemy + Prisma) database.

## 1. ERAlchemy2 (Automated ERD Generation)
Generate Entity-Relationship Diagrams directly from your SQLAlchemy 2.0 models.

### Installation
Requires GraphViz to be installed on your system.
```bash
pip install eralchemy2
```

### Usage (Script)
Create `scripts/generate_erd.py`:
```python
from eralchemy2 import render_er
from app.core.database import Base
import app.models # Ensure all models are imported

render_er(Base, 'database/erd.png')
# Or generate Mermaid for Markdown files
render_er(Base, 'database/erd.md', mode='mermaid_er')
```

---

## 2. Prisma Studio (Visual GUI)
Since the project includes Prisma in the frontend, you can use Prisma Studio for an intuitive data explorer GUI.

### Usage
```bash
cd frontend
npx prisma studio
```
*This will open a GUI at http://localhost:5555 to browse and edit your database records.*

---

## 3. Squawk (SQL Linter)
Lint your SQL migrations (if using raw SQL in Alembic) to find performance issues or downtime risks.

### Installation
```bash
npm install -g squawk
```

### Usage
```bash
squawk backend/alembic/versions/*.sql
```

---

## 4. pgAdmin 4 / DBeaver (External GUIs)
For deep database administration, these are the recommended native clients.

- **pgAdmin 4**: Standard for PostgreSQL.
- **DBeaver**: Universal database tool with great ERD and data export features.

### Connection String (Local)
`postgresql://postgres:password@localhost:5432/bgc_replica`
