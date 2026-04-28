import os
import csv
import random
try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

# Manual parse of .env.local
env_vars = {}
try:
    with open("dashboard/.env.local", "r") as f:
        for line in f:
            if "=" in line:
                k, v = line.strip().split("=", 1)
                env_vars[k.strip()] = v.strip()
except Exception as e:
    print(f"Could not read .env.local: {e}")

NEO4J_URI = env_vars.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = env_vars.get("neo4j_username", "neo4j")
NEO4J_PASSWORD = env_vars.get("neo4j_password", "password")

# Realistic ocean-friendly ports
PORTS = {
    "ROT": {"name": "Rotterdam", "lat": 51.95, "lon": 4.05, "country": "NL"},
    "NYC": {"name": "New York", "lat": 40.67, "lon": -74.04, "country": "US"},
    "SGP": {"name": "Singapore", "lat": 1.27, "lon": 103.80, "country": "SG"},
    "SHA": {"name": "Shanghai", "lat": 31.22, "lon": 122.00, "country": "CN"},
    "DXB": {"name": "Jebel Ali", "lat": 25.01, "lon": 55.05, "country": "AE"},
    "SYD": {"name": "Sydney", "lat": -33.96, "lon": 151.21, "country": "AU"},
    "CPT": {"name": "Cape Town", "lat": -33.90, "lon": 18.42, "country": "ZA"},
    "LGB": {"name": "Long Beach", "lat": 33.75, "lon": -118.21, "country": "US"},
    "TOK": {"name": "Tokyo", "lat": 35.61, "lon": 139.79, "country": "JP"},
    "SAN": {"name": "Santos", "lat": -23.97, "lon": -46.29, "country": "BR"},
}

# Real ocean routes (no direct land crossing, using simplified approximations)
ROUTES = [
    ("SHA", "LGB"), ("LGB", "SHA"), ("TOK", "LGB"), ("LGB", "TOK"),  # Trans-Pacific
    ("NYC", "ROT"), ("ROT", "NYC"), ("SAN", "ROT"), ("ROT", "SAN"),  # Trans-Atlantic
    ("SGP", "DXB"), ("DXB", "SGP"), ("SHA", "SGP"), ("SGP", "SYD"),  # Indian Ocean / Asia
    ("CPT", "ROT"), ("ROT", "CPT"), ("SGP", "CPT"), ("CPT", "SAN"),  # South Atlantic / Indian
]

SHIP_NAMES = ["MV LATTICE", "EVER GLOBE", "MAERSK VOYAGER", "PACIFIC TRADER", "MSC ISABELLA", "CMA CGM ANTOINE", "HAPAG LLOYD BERLIN", "OOCL HONG KONG", "COSCO SHIPPING UNIVERSE", "HYUNDAI ALGECIRAS"]
SHIP_TYPES = ["Container Ship", "Bulk Carrier", "Oil Tanker"]

def generate_csv():
    data = []
    for i in range(1, 51):
        route = random.choice(ROUTES)
        orig = PORTS[route[0]]
        dest = PORTS[route[1]]
        
        mmsi = str(100000000 + i * 1234567)[:9]
        name = f"{random.choice(SHIP_NAMES)} {i}"
        v_type = random.choice(SHIP_TYPES)
        tonnage = random.randint(5000, 25000)
        power = int(tonnage * random.uniform(0.3, 0.6))
        
        # Geopolitics mock
        risk_region = ""
        risk_score = 0.0
        risk_event = ""
        if route[0] == "DXB" or route[1] == "DXB":
            risk_region = "Strait of Hormuz"
            risk_score = 0.8
            risk_event = "High naval tensions"
        elif route[0] == "SHA" or route[1] == "SHA":
            risk_region = "South China Sea"
            risk_score = 0.6
            risk_event = "Territorial disputes"

        data.append({
            "mmsi": mmsi,
            "name": name,
            "type": v_type,
            "tonnage": tonnage,
            "engine_power": power,
            "status": "In Transit",
            "orig_code": route[0],
            "orig_name": orig["name"],
            "orig_lat": orig["lat"],
            "orig_lon": orig["lon"],
            "orig_country": orig["country"],
            "dest_code": route[1],
            "dest_name": dest["name"],
            "dest_lat": dest["lat"],
            "dest_lon": dest["lon"],
            "dest_country": dest["country"],
            "risk_region": risk_region,
            "risk_score": risk_score,
            "risk_event": risk_event
        })

    with open("shipments.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    print(f"Generated shipments.csv with {len(data)} records.")
    return data

def load_into_neo4j(data):
    if not GraphDatabase:
        print("Neo4j library not found. Skipping DB load (CSV generated).")
        return
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        with driver.session() as session:
            # Clear existing data
            session.run("MATCH (n) DETACH DELETE n")
            
            for row in data:
                query = """
                MERGE (o:Port {code: $orig_code})
                ON CREATE SET o.name = $orig_name, o.lat = $orig_lat, o.lon = $orig_lon, o.country = $orig_country
                
                MERGE (d:Port {code: $dest_code})
                ON CREATE SET d.name = $dest_name, d.lat = $dest_lat, d.lon = $dest_lon, d.country = $dest_country
                
                CREATE (s:Shipment {
                    mmsi: $mmsi,
                    name: $name,
                    type: $type,
                    tonnage: $tonnage,
                    engine_power: $engine_power,
                    status: $status
                })
                
                MERGE (s)-[:DEPARTED_FROM]->(o)
                MERGE (s)-[:BOUND_FOR]->(d)
                """
                
                params = {**row}
                
                if row["risk_region"]:
                    query += """
                    MERGE (r:RiskZone {region: $risk_region})
                    ON CREATE SET r.score = $risk_score, r.event = $risk_event
                    MERGE (s)-[:AT_RISK_IN]->(r)
                    """
                
                session.run(query, **params)
        
        print("Successfully loaded data into Neo4j!")
        driver.close()
    except Exception as e:
        print("Failed to connect or load Neo4j:")
        print(e)
        print("\nPlease ensure your Neo4j instance is running and credentials are correct.")

if __name__ == "__main__":
    csv_data = generate_csv()
    load_into_neo4j(csv_data)
