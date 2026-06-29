# Backend for the Job Application Command Centre.
# Designed for HuggingFace Spaces (Docker SDK): the container must listen on
# $PORT (HF sets it to 7860). Lemma + Firebase secrets come from Space secrets.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

WORKDIR /app

# Install Python deps first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# The real Lemma SDK ships vendored inside the lemma-terminal CLI, not on PyPI.
# We vendor it into the image under ./vendor and put it on PYTHONPATH.
COPY vendor/ ./vendor/
ENV PYTHONPATH=/app/vendor

COPY app/ ./app/

EXPOSE 7860

# Use the shell form so $PORT is expanded at runtime (HF injects it).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}
