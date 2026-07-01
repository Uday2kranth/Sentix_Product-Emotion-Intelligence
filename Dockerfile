# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install system compilation dependencies (needed for some Python libraries)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set PYTHONPATH environment variable so python can find the 'app' module
ENV PYTHONPATH=.

# Hugging Face Spaces runs containers as a non-root user (UID 1000) for security.
# We create a user and grant permissions to the work directory.
RUN useradd -m -u 1000 user && \
    chown -R user:user /code
USER user

# Run uvicorn on port 7860 (Hugging Face default port)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
