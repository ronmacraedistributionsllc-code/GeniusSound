# Genius Sound API (FastAPI)

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000      # http://localhost:8000/health
PYTHONPATH=. pytest                         # tests
```
