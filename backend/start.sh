#!/bin/bash

# Backend startup script for Genius Sound
cd /Users/geniussound/GeniusSound/backend

# Install dependencies if not already installed
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
