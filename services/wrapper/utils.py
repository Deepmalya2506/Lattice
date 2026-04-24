"""
Lattice Utils: Engine for Maritime Digital Twin
Handles Model Architecture, Simulation, and Coordinate Logic
"""

import os
import torch
import torch.nn as nn
import numpy as np
import polars as pl

# ======================================== Model Architecture ======================================== #

class PhysicsInformedLSTM(nn.Module):
    def __init__(self, input_size=9, hidden_size=128, output_size=2, num_layers=2):
        super(PhysicsInformedLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(hidden_size, output_size)
        
    def forward(self, x):
        # x shape: [batch, seq_len, input_size]
        out, _ = self.lstm(x)
        # Prediction based on the last time step
        prediction = torch.tanh(self.fc(out[:, -1, :])) 
        return prediction

# ======================================== Route Generation ======================================== #

def generate_great_circle_path(start_coords, end_coords, num_points=100):
    """Generates the 'Ideal' intended shipping lane."""
    lat1, lon1 = np.radians(start_coords)
    lat2, lon2 = np.radians(end_coords)
    
    fractions = np.linspace(0, 1, num_points)
    d = np.arccos(np.sin(lat1)*np.sin(lat2) + np.cos(lat1)*np.cos(lat2)*np.cos(lon2 - lon1))
    
    a = np.sin((1 - fractions) * d) / np.sin(d)
    b = np.sin(fractions * d) / np.sin(d)
    
    x = a * np.cos(lat1) * np.cos(lon1) + b * np.cos(lat2) * np.cos(lon2)
    y = a * np.cos(lat1) * np.sin(lon1) + b * np.cos(lat2) * np.sin(lon2)
    z = a * np.sin(lat1) + b * np.sin(lat2)
    
    lat = np.arctan2(z, np.sqrt(x * x + y * y))
    lon = np.arctan2(y, x)
    
    return np.degrees(np.stack([lat, lon], axis=1))

# ======================================== Simulation Engine ======================================== #

def run_lattice_simulation(model, start_coords, end_coords, scaling_map, tonnage, engine_power, num_steps=50):
    """
    Simulates ship movement with AI-predicted physics drift.
    Matches the 9-feature input vector required by the PI-LSTM.
    """
    model.eval()
    ideal_path = generate_great_circle_path(start_coords, end_coords, num_points=num_steps)
    
    realized_path = [ideal_path[0]]
    drift_metrics = []

    # Constants for normalization
    lat_m, lat_s = scaling_map['cell_ll_lat_mean'], scaling_map['cell_ll_lat_std']
    lon_m, lon_s = scaling_map['cell_ll_lon_mean'], scaling_map['cell_ll_lon_std']

    # Physics-based dampener (approx 0.005 degrees ~ 0.55km per step)
    DRIFT_DAMPENER = 0.005 

    with torch.no_grad():
        for i in range(1, len(ideal_path)):
            current_pos = realized_path[-1]
            dest_pos = ideal_path[-1] # Final destination
            
            # 1. Construct the 9-feature vector
            # Order: [curr_lat, curr_lon, dest_lat, dest_lon, tonnage, power, uo, vo, residual]
            # All values are normalized before being passed to the tensor
            
            norm_features = [
                (current_pos[0] - lat_m) / lat_s,      # 1. Norm Lat
                (current_pos[1] - lon_m) / lon_s,      # 2. Norm Lon
                (dest_pos[0] - lat_m) / lat_s,         # 3. Norm Dest Lat
                (dest_pos[1] - lon_m) / lon_s,         # 4. Norm Dest Lon
                tonnage / 5000.0,                      # 5. Scaled Tonnage (example divisor)
                engine_power / 2000.0,                 # 6. Scaled Power (example divisor)
                0.15,                                  # 7. Mock uo (Copernicus Eastward)
                0.05,                                  # 8. Mock vo (Copernicus Northward)
                0.01                                   # 9. Mock Physics Residual
            ]
            
            # 2. Reshape to (Batch=1, Seq=1, Features=9)
            input_tensor = torch.tensor(norm_features, dtype=torch.float32).view(1, 1, 9)
            
            # 3. Predict Normalized Delta
            delta_pred = model(input_tensor).numpy()[0] # Returns [delta_lat, delta_lon]
            
            # 4. Reconstruct Path with Drift
            physics_drift_lat = delta_pred[0] * DRIFT_DAMPENER
            physics_drift_lon = delta_pred[1] * DRIFT_DAMPENER
            
            ideal_move = ideal_path[i] - ideal_path[i-1]
            actual_move = ideal_move + np.array([physics_drift_lat, physics_drift_lon])
            
            new_pos = realized_path[-1] + actual_move
            realized_path.append(new_pos)
            
            # 5. Distance calculation (Haversine approximation for status check)
            dist_km = np.linalg.norm(new_pos - ideal_path[i]) * 111.32
            drift_metrics.append(float(dist_km))

    return ideal_path, np.array(realized_path), drift_metrics