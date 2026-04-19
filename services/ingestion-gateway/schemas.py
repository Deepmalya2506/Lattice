from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Location(BaseModel):
    latitude: float
    longitude: float

class TelemetryData(BaseModel):
    shipment_id: str
    timestamp: datetime
    location: Location
    speed_kmh: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    status: str = "IN_TRANSIT"

class DisruptionAlert(BaseModel):
    disruption_id: str
    type: str = Field(description="e.g., STORM, FLOOD, TRAFFIC")
    severity: int = Field(ge=1, le=5)
    location: Location
    radius_km: float
    description: str

class ShipmentRegistration(BaseModel):
    shipment_id: str
    origin: Location
    destination: Location
    cargo_type: str
    priority: str = "NORMAL" # NORMAL, HIGH, CRITICAL
