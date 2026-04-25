import csv
import random

# Real World Ports & Coordinates
PORTS = {
    "Shanghai": {"lat": 31.22, "lon": 121.48, "country": "China"},
    "Singapore": {"lat": 1.27, "lon": 103.80, "country": "Singapore"},
    "Ningbo": {"lat": 29.87, "lon": 121.55, "country": "China"},
    "Shenzhen": {"lat": 22.54, "lon": 114.07, "country": "China"},
    "Busan": {"lat": 35.10, "lon": 129.04, "country": "South Korea"},
    "Hong Kong": {"lat": 22.30, "lon": 114.17, "country": "Hong Kong"},
    "Tokyo": {"lat": 35.61, "lon": 139.79, "country": "Japan"},
    "Los Angeles": {"lat": 33.75, "lon": -118.26, "country": "USA"},
    "Long Beach": {"lat": 33.74, "lon": -118.21, "country": "USA"},
    "New York": {"lat": 40.67, "lon": -74.04, "country": "USA"},
    "Savannah": {"lat": 32.08, "lon": -81.09, "country": "USA"},
    "Vancouver": {"lat": 49.28, "lon": -123.12, "country": "Canada"},
    "Rotterdam": {"lat": 51.95, "lon": 4.05, "country": "Netherlands"},
    "Antwerp": {"lat": 51.22, "lon": 4.40, "country": "Belgium"},
    "Hamburg": {"lat": 53.55, "lon": 9.99, "country": "Germany"},
    "Felixstowe": {"lat": 51.96, "lon": 1.35, "country": "UK"},
    "Valencia": {"lat": 39.47, "lon": -0.33, "country": "Spain"},
    "Jebel Ali": {"lat": 25.01, "lon": 55.06, "country": "UAE"},
    "Port Klang": {"lat": 3.00, "lon": 101.40, "country": "Malaysia"},
    "Colombo": {"lat": 6.93, "lon": 79.85, "country": "Sri Lanka"},
    "Cape Town": {"lat": -33.90, "lon": 18.42, "country": "South Africa"},
    "Santos": {"lat": -23.97, "lon": -46.29, "country": "Brazil"},
    "Dubai": {"lat": 25.20, "lon": 55.27, "country": "UAE"},
    "Algeciras": {"lat": 36.13, "lon": -5.45, "country": "Spain"},
    "Bremerhaven": {"lat": 53.54, "lon": 8.58, "country": "Germany"},
    "Port Said": {"lat": 31.26, "lon": 32.30, "country": "Egypt"},
}

SHIP_TYPES = ["Container Ship", "Bulk Carrier", "Oil Tanker", "LNG Carrier", "Ro-Ro"]
VESSEL_NAMES = [
    "Ever Given", "Maersk Mc-Kinney Moller", "MSC Oscar", "CMA CGM Marco Polo", "OOCL Hong Kong",
    "COSCO Shipping Universe", "HMM Algeciras", "ONE Trust", "Ever Ace", "Madrid Maersk",
    "MSC Tessa", "Berlin Express", "Munich Maersk", "Tianjin Maersk", "MOL Triumph",
    "Barzan", "Al Dahna", "Al Zubara", "Al Nefud", "Ulsan Express",
    "Lattice Alpha", "Lattice Beta", "Lattice Gamma", "Lattice Delta", "Lattice Epsilon"
]

def generate_shipments(n=50):
    shipments = []
    port_list = list(PORTS.keys())
    
    for i in range(n):
        origin = random.choice(port_list)
        destination = random.choice(port_list)
        while destination == origin:
            destination = random.choice(port_list)
            
        mmsi = random.randint(200000000, 700000000)
        vessel_name = f"{random.choice(VESSEL_NAMES)} {random.randint(1, 99)}"
        vessel_type = random.choice(SHIP_TYPES)
        tonnage = random.randint(10000, 240000)
        power = random.randint(5000, 80000)
        
        orig_data = PORTS[origin]
        dest_data = PORTS[destination]
        
        # Geopolitical mock data based on regions
        risk_region = ""
        risk_score = 0.0
        risk_event = ""
        
        if "Shanghai" in [origin, destination] or "Shenzhen" in [origin, destination]:
            risk_region = "South China Sea"
            risk_score = 0.65
            risk_event = "Increased Naval Presence"
        elif "Jebel Ali" in [origin, destination] or "Dubai" in [origin, destination]:
            risk_region = "Strait of Hormuz"
            risk_score = 0.82
            risk_event = "Regional Tensions"
        elif "Rotterdam" in [origin, destination] or "Hamburg" in [origin, destination]:
            risk_region = "North Sea"
            risk_score = 0.15
            risk_event = "Weather Advisory"
        
        shipments.append({
            "mmsi": mmsi,
            "name": vessel_name,
            "type": vessel_type,
            "tonnage": tonnage,
            "engine_power": power,
            "status": "In Transit",
            "orig_name": origin,
            "orig_lat": orig_data["lat"],
            "orig_lon": orig_data["lon"],
            "orig_country": orig_data["country"],
            "dest_name": destination,
            "dest_lat": dest_data["lat"],
            "dest_lon": dest_data["lon"],
            "dest_country": dest_data["country"],
            "risk_region": risk_region,
            "risk_score": risk_score,
            "risk_event": risk_event
        })
    return shipments

def save_to_csv(data, filename="shipments.csv"):
    keys = data[0].keys()
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)

if __name__ == "__main__":
    data = generate_shipments(60)
    save_to_csv(data)
    print("Generated 60 real-world dummy shipments in shipments.csv")
