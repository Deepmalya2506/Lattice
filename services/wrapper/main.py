import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from google.cloud import storage
from services.wrapper.utils import PhysicsInformedLSTM, run_lattice_simulation

app = FastAPI()

# --- CONFIGURATION ---
BUCKET_NAME = "lattice-maritime-data"
MODEL_BLOB_NAME = "models/lattice_pi_lstm_cpu.pth"
# Use /tmp/ as it is the only writable directory in Cloud Run
LOCAL_MODEL_PATH = r"D:\Lattice\services\risk_scoring_engine\lattice_pi_lstm_cpu.pth"

# Load scaling map (standardized for your 2024 dataset)
scaling_map = {
    'cell_ll_lat_mean': -14.2, 'cell_ll_lat_std': 25.1, 
    'cell_ll_lon_mean': -30.5, 'cell_ll_lon_std': 40.2
}

# --- GCS DOWNLOAD LOGIC ---
def download_model_from_gcs():
    """Only downloads if the model isn't already present in /tmp/ or local path."""
    if os.path.exists(LOCAL_MODEL_PATH):
        print(f"Model already exists at {LOCAL_MODEL_PATH}. Skipping download.")
        return

    print(f"Downloading model from gs://{BUCKET_NAME}/{MODEL_BLOB_NAME}...")
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(MODEL_BLOB_NAME)
        blob.download_to_filename(LOCAL_MODEL_PATH)
        print("Download complete.")
    except Exception as e:
        print(f"GCS Download failed: {e}")
        # If local and download fails, try to find the file in your project folder as a backup
        if os.path.exists("services/risk_scoring_engine/lattice_pi_lstm_cpu.pth"):
             import shutil
             shutil.copy("services/risk_scoring_engine/lattice_pi_lstm_cpu.pth", LOCAL_MODEL_PATH)
             print("Used local backup model.")

# --- MODEL INITIALIZATION ---
# NOTE: Ensure input_size matches your training (9 if using dynamic weather/ship data)
# If your weights expect 9 features, 6 will trigger the RuntimeError.
model = PhysicsInformedLSTM(input_size=9, hidden_size=128, output_size=2)

@app.on_event("startup")
async def startup_event():
    download_model_from_gcs()
    try:
        # Load weights into the architecture
        state_dict = torch.load(LOCAL_MODEL_PATH, map_location='cpu', weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()
        print("Physics-Informed LSTM loaded and ready for inference.")
    except Exception as e:
        print(f"FAILED TO LOAD MODEL: {e}")
        # Consider using strict=False ONLY for debugging architecture mismatches
        # model.load_state_dict(state_dict, strict=False)

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    tonnage: float       
    engine_power: float  

@app.get("/")
async def root():
    return {"status": "Lattice API is Online"}
    
@app.post("/simulate_route")
async def simulate(request: RouteRequest):
    # Inside main.py simulate(request: RouteRequest)
    ideal, realized, deltas = run_lattice_simulation(
        model, 
        (request.start_lat, request.start_lon), 
        (request.end_lat, request.end_lon), 
        scaling_map,
        request.tonnage,      # Passing from request
        request.engine_power   # Passing from request
    )
    
    return {
        "ideal_path": ideal.tolist(),
        "realized_path": realized.tolist(),
        "total_drift_km": sum(deltas)
    }