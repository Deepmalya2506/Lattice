import polars as pl
import os
from glob import glob

# Load metadata and keep only what the LSTM needs
meta = pl.read_csv("fishing-vessels-v3.csv")
meta = meta.select([
    "mmsi", 
    "vessel_class_gfw", 
    "length_m_gfw", 
    "engine_power_kw_gfw", 
    "tonnage_gt_gfw"
]).unique(subset=["mmsi"]) # Ensure one entry per ship