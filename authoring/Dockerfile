FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set working directory
WORKDIR /app

# Install system dependencies with retry mechanism
RUN apt-get update --fix-missing || true && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY authoring/requirements.txt /app/authoring/requirements.txt
RUN pip install --no-cache-dir -r authoring/requirements.txt

# Copy project files
COPY . /app

# Expose port
EXPOSE 8000
