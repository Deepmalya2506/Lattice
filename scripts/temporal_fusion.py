import polars as pl
import xarray as xr
import numpy as np
import os
from glob import glob

def fuse_physics(parquet_dir, nc_dir, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Get a sorted list of your .nc files
    nc_files = sorted(glob(os.path.join(nc_dir, "cmems_mod_glo_phy_my_0.083deg_P1D-m_*.nc")))
    
    if len(nc_files) != 12:
        print(f"Warning: Found {len(nc_files)} .nc files. Expected 12.")

    for i, nc_path in enumerate(nc_files):
        month = i + 1
        month_str = f"{month:02d}"
        parquet_path = os.path.join(parquet_dir, f"ais_atlantic_2024_{month_str}.parquet")
        
        if not os.path.exists(parquet_path):
            print(f"Skipping Month {month_str}: Parquet file missing.")
            continue

        print(f"--- Processing Month {month_str} ---")
        print(f"AIS: {os.path.basename(parquet_path)}")
        print(f"NC:  {os.path.basename(nc_path)}")

        # 2. Load AIS Data
        ais_df = pl.read_parquet(parquet_path)
        
        # 3. Load Copernicus Data
        # Chunks help manage memory by not loading the whole file at once
        ds = xr.open_dataset(nc_path, chunks={'time': 1})

        # 4. Extract Coordinates
        lats = ais_df["cell_ll_lat"].to_numpy()
        lons = ais_df["cell_ll_lon"].to_numpy()
        
        # Convert AIS 'date' string to datetime64[ns]
        times = ais_df.select(pl.col("date").str.to_datetime()).to_series().to_numpy()

        # 5. Vectorized 'Nearest Neighbor' Lookup
        print("Extracting physics values (this may take a few minutes)...")
    
        query_lats = xr.DataArray(lats, dims="z")
        query_lons = xr.DataArray(lons, dims="z")
        query_times = xr.DataArray(times, dims="z")

        # .sel() finds the closest grid point in 4D space
        extracted = ds.sel(
            latitude=query_lats, 
            longitude=query_lons, 
            time=query_times, 
            method="nearest"
        ).compute() 

        # 6. Add to Polars and Save
        # .flatten() is REQUIRED to remove the 'depth' dimension (N, 1) -> (N,)
        fused_df = ais_df.with_columns([
            pl.Series("uo", extracted["uo"].values.flatten()).cast(pl.Float32),
            pl.Series("vo", extracted["vo"].values.flatten()).cast(pl.Float32),
            pl.Series("zos", extracted["zos"].values.flatten()).cast(pl.Float32)
        ])

        output_path = os.path.join(output_dir, f"fused_ais_physics_2024_{month_str}.parquet")
        fused_df.write_parquet(output_path)
        
        print(f"Successfully saved fused data to: {output_path}")
        ds.close()

# --- Configuration ---
parquet_in = r"D:\AIS_data\atlantic_parquet_2024" # parquet data from extracted csvs for regional scan
nc_in = r"D:\Copernicus_data" # netCDF data from Copernicus  
fused_out = r"D:\AIS_data\fused_training_data_2024"# 

if __name__ == "__main__":
    fuse_physics(parquet_in, nc_in, fused_out)