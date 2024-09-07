//
//  aabb.hpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#ifndef aabb_hpp
#define aabb_hpp

#include "glm/glm.hpp"
#include <vector>

class AABB {
    
public:
    glm::vec3 minCorner, maxCorner;
    
    //Plane parameters
    glm::vec3 normals[6];
    float D[6];
    
    AABB();
    
    void make_planes();
    
    void grow(glm::vec3& corner);
    
    float surface_area();
    
    bool contains(glm::vec3& point);
    
    std::vector<glm::vec3> clip_polygon(std::vector<glm::vec3> input);
    
    std::vector<glm::vec3> clip_against_plane(int i, std::vector<glm::vec3>& input);
    
    bool behind_plane(int i, glm::vec3& point);
    
    glm::vec3 intersection_point(int i, glm::vec3& point_a, glm::vec3& point_b);
};

#endif /* aabb_hpp */
