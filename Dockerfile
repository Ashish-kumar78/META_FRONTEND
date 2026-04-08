FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Install the project in editable mode for the "start" script to work
RUN pip install -e .

EXPOSE 7860

# Run using the entry point defined in pyproject.toml or direct module
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
