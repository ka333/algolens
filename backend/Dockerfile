FROM python:3.10-slim

WORKDIR /app

# Install basic compile dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user with UID 1000 (required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set working directory inside user's home folder
WORKDIR $HOME/app

# Copy requirements and install dependencies
COPY --chown=user:user requirements.txt $HOME/app/requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy the application files
COPY --chown=user:user . $HOME/app

# Hugging Face Spaces binds to port 7860
EXPOSE 7860

# Start Uvicorn pointing to app.main
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
