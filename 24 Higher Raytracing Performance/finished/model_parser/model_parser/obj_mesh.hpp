//
//  obj_mesh.hpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#ifndef obj_mesh_hpp
#define obj_mesh_hpp

#include "glm/glm.hpp"
#include "triangle.hpp"
#include "node.hpp"
#include "aabb.hpp"
#include <vector>
#include <array>
#include <string>
#include <fstream>
#include <iostream>

class ObjMesh {
public:
    
    ObjMesh(const char* input_filepath, const char* output_filepath);
    
private:
    
    std::vector<glm::vec3> v;
    std::vector<Triangle> triangles;
    std::vector<int> triangleIndices;
    std::vector<Node> nodes;
    int nodesUsed = 0;
    glm::vec3 minCorner = glm::vec3( 999999,  999999,  999999);
    glm::vec3 maxCorner = glm::vec3(-999999, -999999, -999999);
    int spatialSplitCount = 0;
    
    void read_file(const char* filepath);
    
    std::vector<std::string> split(std::string line, std::string delimiter);
    
    void read_vertex_data(std::vector<std::string>& words);
    
    void read_face_data(std::vector<std::string>& words);
    
    void read_corner(std::string& vertex_description, Triangle& tri);
    
    void build_bvh();
    
    void update_bounds(int nodeIndex);
    
    void subdivide(int nodeIndex);
    
    void subdivide_object(int nodeIndex, int axis, float splitPos, int sahReorder);
    
    void subdivide_spatial(int nodeIndex, int axis, float splitPos, int sahReorder);
    
    std::array<float,2> evaluate_sah_object(Node& node, int axis, float split_pos);
    
    std::array<float,2> evaluate_sah_spatial(Node& node, int axis, float split_pos);
    
    void write_file(const char* filepath);
    
};

#endif /* obj_mesh_hpp */
