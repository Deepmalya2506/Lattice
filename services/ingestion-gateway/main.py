from fastapi import FastAPI, HTTPException
import schemas
import redis_client
import logging
from datetime import timezone

app = FastAPI(title="Lattice Ingestion Gateway", version="1.0.0")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/")
def read_root():
    return {"status": "Ingestion Gateway is running."}

@app.get("/health")
def health_check():
    redis_status = redis_client.ping_redis()
    return {
        "service": "Ingestion Gateway",
        "redis_connected": redis_status
    }

@app.post("/api/v1/telemetry")
def ingest_telemetry(data: schemas.TelemetryData):
    """
    Ingest real-time GPS/AIS telemetry from shipments.
    """
    # Normalization: Ensure UTC timezone for timestamp
    if data.timestamp.tzinfo is None:
        data.timestamp = data.timestamp.replace(tzinfo=timezone.utc)
    
    # Optional: Basic validation on coordinates
    if not (-90 <= data.location.latitude <= 90) or not (-180 <= data.location.longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates.")

    payload = data.model_dump()
    
    try:
        redis_client.update_shipment_location(data.shipment_id, payload)
        logger.info(f"Updated location for shipment {data.shipment_id}")
        return {"status": "success", "message": f"Telemetry recorded for {data.shipment_id}"}
    except Exception as e:
        logger.error(f"Failed to update Redis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while caching data.")

@app.get("/api/v1/shipments/{shipment_id}/location")
def get_location(shipment_id: str):
    """
    Get the latest known location for a specific shipment.
    """
    data = redis_client.get_shipment_location(shipment_id)
    if not data:
        raise HTTPException(status_code=404, detail="Shipment not found or no location data available.")
    return data

@app.get("/api/v1/shipments/active")
def get_all_active():
    """
    Get the latest known locations for all active shipments.
    """
    data = redis_client.get_all_active_shipments()
    return {"active_shipments": data}
