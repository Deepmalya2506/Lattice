import redis
import json
from typing import Optional
import os

# Using environment variables or fallback to localhost
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Initialize Redis client
# decode_responses=True ensures we get strings back instead of bytes
client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

def ping_redis() -> bool:
    try:
        return client.ping()
    except redis.ConnectionError:
        return False

def update_shipment_location(shipment_id: str, data: dict):
    """
    Store the latest telemetry data for a shipment.
    """
    key = f"shipment:{shipment_id}:latest"
    # Convert datetime objects to string before JSON serialization if needed
    if 'timestamp' in data and not isinstance(data['timestamp'], str):
        data['timestamp'] = data['timestamp'].isoformat()
    
    client.set(key, json.dumps(data))

def get_shipment_location(shipment_id: str) -> Optional[dict]:
    """
    Retrieve the latest known position for a shipment.
    """
    key = f"shipment:{shipment_id}:latest"
    data = client.get(key)
    if data:
        return json.loads(data)
    return None

def get_all_active_shipments() -> dict:
    """
    Retrieve all shipments and their latest locations.
    """
    keys = client.keys("shipment:*:latest")
    shipments = {}
    for key in keys:
        shipment_id = key.split(":")[1]
        data = client.get(key)
        if data:
            shipments[shipment_id] = json.loads(data)
    return shipments
