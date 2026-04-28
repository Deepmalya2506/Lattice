import os
import csv
try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

# Fallback data if Neo4j is down
SHIPMENTS_FALLBACK = []

def _load_csv_fallback():
    global SHIPMENTS_FALLBACK
    if SHIPMENTS_FALLBACK: return
    try:
        with open("shipments.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                geopolitics = None
                if row.get("risk_region"):
                    geopolitics = {
                        "region": row["risk_region"],
                        "risk_score": float(row["risk_score"]),
                        "event": row["risk_event"]
                    }
                
                SHIPMENTS_FALLBACK.append({
                    "mmsi": row["mmsi"],
                    "name": row["name"],
                    "type": row["type"],
                    "tonnage": float(row["tonnage"]),
                    "engine_power": float(row["engine_power"]),
                    "status": row["status"],
                    "origin": {
                        "name": row["orig_name"],
                        "lat": float(row["orig_lat"]),
                        "lon": float(row["orig_lon"]),
                        "country": row["orig_country"]
                    },
                    "destination": {
                        "name": row["dest_name"],
                        "lat": float(row["dest_lat"]),
                        "lon": float(row["dest_lon"]),
                        "country": row["dest_country"]
                    },
                    "geopolitics": geopolitics
                })
    except Exception as e:
        print(f"Error loading CSV fallback: {e}")

_load_csv_fallback()

# Read .env manually for Neo4j credentials
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def get_db_driver():
    if not GraphDatabase: return None
    try:
        return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    except:
        return None

def get_all_shipments():
    driver = get_db_driver()
    if not driver:
        print("Using CSV Fallback for shipments.")
        return SHIPMENTS_FALLBACK
    
    shipments = []
    try:
        with driver.session() as session:
            # Cypher to fetch shipment + origin + dest + optional risk zone
            query = """
            MATCH (s:Shipment)-[:DEPARTED_FROM]->(o:Port)
            MATCH (s)-[:BOUND_FOR]->(d:Port)
            OPTIONAL MATCH (s)-[:AT_RISK_IN]->(r:RiskZone)
            RETURN s, o, d, r
            """
            result = session.run(query)
            for record in result:
                s = record["s"]
                o = record["o"]
                d = record["d"]
                r = record["r"]
                
                geopolitics = None
                if r:
                    geopolitics = {
                        "region": r["region"],
                        "risk_score": float(r["score"]),
                        "event": r["event"]
                    }
                
                shipments.append({
                    "mmsi": s["mmsi"],
                    "name": s["name"],
                    "type": s["type"],
                    "tonnage": float(s["tonnage"]),
                    "engine_power": float(s["engine_power"]),
                    "status": s["status"],
                    "origin": {
                        "name": o["name"],
                        "lat": float(o["lat"]),
                        "lon": float(o["lon"]),
                        "country": o["country"]
                    },
                    "destination": {
                        "name": d["name"],
                        "lat": float(d["lat"]),
                        "lon": float(d["lon"]),
                        "country": d["country"]
                    },
                    "geopolitics": geopolitics
                })
        return shipments
    except Exception as e:
        print(f"Neo4j Error: {e}. Falling back to CSV.")
        return SHIPMENTS_FALLBACK

def get_shipment_by_mmsi(mmsi: str):
    driver = get_db_driver()
    if not driver:
        for s in SHIPMENTS_FALLBACK:
            if s["mmsi"] == mmsi: return s
        return None
        
    try:
        with driver.session() as session:
            query = """
            MATCH (s:Shipment {mmsi: $mmsi})-[:DEPARTED_FROM]->(o:Port)
            MATCH (s)-[:BOUND_FOR]->(d:Port)
            OPTIONAL MATCH (s)-[:AT_RISK_IN]->(r:RiskZone)
            RETURN s, o, d, r
            """
            result = session.run(query, mmsi=mmsi)
            record = result.single()
            if not record: return None
            
            s = record["s"]
            o = record["o"]
            d = record["d"]
            r = record["r"]
            
            geopolitics = None
            if r:
                geopolitics = {
                    "region": r["region"],
                    "risk_score": float(r["score"]),
                    "event": r["event"]
                }
                
            return {
                "mmsi": s["mmsi"],
                "name": s["name"],
                "type": s["type"],
                "tonnage": float(s["tonnage"]),
                "engine_power": float(s["engine_power"]),
                "status": s["status"],
                "origin": {
                    "name": o["name"],
                    "lat": float(o["lat"]),
                    "lon": float(o["lon"]),
                    "country": o["country"]
                },
                "destination": {
                    "name": d["name"],
                    "lat": float(d["lat"]),
                    "lon": float(d["lon"]),
                    "country": d["country"]
                },
                "geopolitics": geopolitics
            }
    except Exception as e:
        print(f"Neo4j Error: {e}. Falling back to CSV.")
        for s in SHIPMENTS_FALLBACK:
            if s["mmsi"] == mmsi: return s
        return None
