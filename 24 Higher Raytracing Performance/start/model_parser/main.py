import obj_mesh

files_to_load = [
    "ground.obj",
    "statue.obj"
]

output_filepaths = [
    "ground.blas",
    "statue.blas"
]

for i in range(len(files_to_load)):
    model = obj_mesh.ObjMesh(files_to_load[i], output_filepaths[i])