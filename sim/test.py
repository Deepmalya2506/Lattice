import requests
import folium
from folium.plugins import AntPath
import numpy as np

# Configuration
# previous local test route: http://127.0.0.1:8080/simulate_route
# cloud route: 
API_URL = "https://lattice-app-936844506729.us-central1.run.app/simulate_route" # Adjust port if necessary

def fetch_simulation_data(payload):
    """Hits the FastAPI endpoint and returns the JSON result."""
    try:
        response = requests.post(API_URL, json=payload)
        response.raise_for_status() # Check for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}")
        return None

def visualize_lattice_simulation(data):
    """Generates the Folium map from the API response data."""
    # Convert lists to numpy arrays for distance math
    ideal_path = np.array(data['ideal_path'])
    realized_path = np.array(data['realized_path'])
    
    # Initialize map at start point
    m = folium.Map(location=ideal_path[0].tolist(), zoom_start=4, tiles="cartodbpositron")

    # 1. Add the "Ideal" Path (The Plan - Blue)
    folium.PolyLine(
        ideal_path.tolist(), 
        color="blue", 
        weight=2, 
        opacity=0.6, 
        tooltip="Intended Route"
    ).add_to(m)

    # 2. Add the "Realized" Path (AI Predicted - Red AntPath)
    AntPath(
        realized_path.tolist(),
        color="red",
        pulse_color="white",
        weight=4,
        tooltip="Predicted Drift Path"
    ).add_to(m)

    # 3. Add Final Drift Marker
    final_dist = np.linalg.norm(realized_path[-1] - ideal_path[-1]) * 111.32
    folium.Marker(
        realized_path[-1].tolist(), 
        popup=f"Final Drift: {final_dist:.2f} km",
        icon=folium.Icon(color='red', icon='ship', prefix='fa')
    ).add_to(m)

    m.save("lattice_automated_test.html")
    print(f"Success! Simulation saved to 'lattice_automated_test.html'. Total Drift: {final_dist:.2f} km")

if __name__ == "__main__":
    # Sample B2B Voyage Data
    test_payload = {
        "start_lat": 48.8566,
        "start_lon": 2.3522,
        "end_lat": 40.7128,
        "end_lon": -74.0060,
        "tonnage": 2099.72, # Adding metadata to the request
        "engine_power": 793.89
    }

    print("Requesting simulation from Lattice API...")
    sim_data = fetch_simulation_data(test_payload)
    
    if sim_data:
        visualize_lattice_simulation(sim_data)