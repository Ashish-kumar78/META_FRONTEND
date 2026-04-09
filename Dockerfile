# ── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# ── Stage 2: Python backend + serve frontend ────────────────────────────────
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Also install openenv-core and dependencies from pyproject.toml
COPY pyproject.toml uv.lock ./
COPY requirements.txt root_requirements.txt
RUN pip install --no-cache-dir -r root_requirements.txt

COPY . .

# Install the project in editable mode for the "start" script to work
RUN pip install -e .

COPY --from=frontend-builder /app/frontend/dist ./static/

EXPOSE 7860

# Run using the entry point defined in pyproject.toml or direct module
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
