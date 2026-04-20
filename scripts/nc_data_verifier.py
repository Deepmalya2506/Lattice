import xarray as xr

filepath=r"D:\Copernicus_data\cmems_mod_glo_phy_my_0.083deg_P1D-m_1776686378510.nc"
ds = xr.open_dataset(filepath)

print("---")
print("Coordinates",ds.coords)
print("---")
print("Variables",ds.variables)
print("---")
print("Variables Keys",ds.variables.keys())
print("------")
print("Dimensions",ds.dims)
print("---")
print("Data variables",ds.data_vars)
print("---")
print("Coordinates",ds.coords)
print("---")
print("Coordinates Keys",ds.coords.keys())
print("Dimensions",ds.dims)
print("Attributes",ds.attrs)
print("Time",ds.time.values)
print("Latitude",ds.latitude.values)
print("Longitude",ds.longitude.values)
print("Depth",ds.depth.values)
print("Bottom temperature",ds.bottomT.values)
print("Salinity",ds.so.values)

