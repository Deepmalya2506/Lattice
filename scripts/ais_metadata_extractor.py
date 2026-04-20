import polars as pl
import os
from glob import glob

# Load metadata and keep only what the LSTM needs
meta = pl.read_csv(r"D:\AIS_data\fishing-vessels-v3.csv")
meta = meta.select([
    "mmsi", 
    "vessel_class_gfw", 
    "length_m_gfw", 
    "engine_power_kw_gfw", 
    "tonnage_gt_gfw"
]).unique(subset=["mmsi"])

def process_year_2024(input_dir, output_dir, meta_df):
    os.makedirs(output_dir, exist_ok=True)
    
    all_files = sorted(glob(os.path.join(input_dir, "mmsi-daily-csvs-10-v3-2024-*.csv")))
    
    for month in range(1, 13):
        month_str = f"{month:02d}"
        month_files = [f for f in all_files if f"-2024-{month_str}-" in f]
        
        if not month_files:
            continue
            
        print(f"Processing Month: {month_str}...")
        
        month_data_list = []
        for file in month_files:
            # FIXED: Added schema_overrides to force numeric columns to Float64
            # This prevents the 'Int64' vs 'Float64' mismatch error
            day_data = pl.scan_csv(
                file,
                schema_overrides={
                    "hours": pl.Float64,
                    "fishing_hours": pl.Float64
                }
            ).filter(
                (pl.col("cell_ll_lat").is_between(-4.39, 67.16)) &
                (pl.col("cell_ll_lon").is_between(-75.47, 5.98))
            )
            month_data_list.append(day_data)
        
        if month_data_list:
            # Now concat will work because schemas are identical
            full_month = pl.concat(month_data_list)
            
            full_month = full_month.join(meta_df.lazy(), on="mmsi", how="left")
            
            output_path = os.path.join(output_dir, f"ais_atlantic_2024_{month_str}.parquet")
            full_month.collect().write_parquet(output_path)
            print(f"Saved: {output_path}")

# Run it
input_dir=r"D:\AIS_data\mmsi-daily-csvs-10-v3-2024"
output_dir=r"D:\AIS_data\atlantic_parquet_2024"
process_year_2024(input_dir=input_dir, output_dir=output_dir, meta_df=meta)