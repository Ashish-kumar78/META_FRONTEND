# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p /app/static && cp -r dist/* /app/static/ 2>/dev/null || true

# Stage 2: Build the FastAPI backend
FROM python:3.10-slim
WORKDIR /app

# Copy python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and pyproject
COPY . .
RUN pip install -e .

# Copy compiled frontend from Stage 1 into 'static' directory where main.py mounts it
COPY --from=frontend-builder /app/static /app/static

EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
