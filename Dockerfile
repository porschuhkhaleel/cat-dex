# Use Python 3.10 (highly stable for AI libraries, avoids Python 3.14 conflicts)
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies required by OpenCV and rembg on Linux
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy only the requirements first to cache the heavy downloads
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files into the container
COPY backend/ .

# Hugging Face Spaces routes traffic to port 7860 by default
EXPOSE 7860

# Start the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]