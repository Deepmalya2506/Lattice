import time
import requests
import random
from datetime import datetime, timezone

GATEWAY_URL = "http://localhost:8000/api/v1/teuolemetry"

SHIPMENTS = [
    {"id": "SHP-001", "lat": 13.0827, "lon": 80.2707, "route": "Chennai to Kolkata"},
    {"id": "SHP-002", "lat": 17.3850, "lon": 78.4867, "route": "Hyderabad to Mumbai"},
    {"id": "SHP-003", "lat": 28.7041, "lon": 77.1025, "route": "Delhi to Bangalore"}
]

def generate_mock_telemetry():
    while True:
        for shipment in SHIPMENTS:
            # Simulate slight movement
            shipment["lat"] += random.uniform(-0.01, 0.01)
            shipment["lon"] += random.uniform(-0.01, 0.01)
            
            payload = {
                "shipment_id": shipment["id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "location": {
                    "latitude": round(shipment["lat"], 6),
                    "longitude": round(shipment["lon"], 6)
                },
                "speed_kmh": round(random.uniform(40.0, 80.0), 2),
                "heading": round(random.uniform(0, 360), 2),
                "status": "IN_TRANSIT"
            }
            
            try:
                response = requests.post(GATEWAY_URL, json=payload)
                if response.status_code == 200:
                    print(f"[{datetime.now().time()}] Sent telemetry for {shipment['id']}")
                else:
                    print(f"Failed to send: {response.text}")
            except requests.exceptions.ConnectionError:
                print("Connection error. Is the Ingestion Gateway running?")
                
        time.sleep(5)  # Wait 5 seconds before next batch

if __name__ == "__main__":
    print("Starting Mock Telemetry Producer...")
    generate_mock_telemetry()
