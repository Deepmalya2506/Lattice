FROM python:3.10-slim

WORKDIR /app

# Copy specific requirements for the optimizer
COPY services/optimizer/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything for context
COPY . .

# Launch using the optimizer entrypoint (Mirroring your localhost:8000 command)
CMD ["sh", "-c", "uvicorn services.optimizer.main:app --host 0.0.0.0 --port ${PORT:-8080}"]