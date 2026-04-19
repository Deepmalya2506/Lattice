import xarray as xr

filepath=r"copernicus_data\cmems_mod_glo_phy_my_0.083deg_P1D-m_1776613626385.nc"
ds = xr.open_dataset(filepath)
print(ds.coords)
print(ds.variables)
print(ds.variables.keys())