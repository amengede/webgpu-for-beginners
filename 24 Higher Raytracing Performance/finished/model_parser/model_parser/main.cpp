//
//  main.cpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#include <iostream>
#include <vector>
#include "aabb.hpp"
#include "node.hpp"
#include "triangle.hpp"
#include "obj_mesh.hpp"

int main(int argc, const char * argv[]) {
    
    std::vector<const char*> files_to_load = {
        "ground.obj",
        "statue.obj"
    };
    
    std::vector<const char*> output_filepaths = {
        "ground.blas",
        "statue.blas"
    };
    
    for (int i = 0; i < files_to_load.size(); ++i) {
        
        ObjMesh load(files_to_load[i], output_filepaths[i]);
        
    }
    
    return 0;
}
