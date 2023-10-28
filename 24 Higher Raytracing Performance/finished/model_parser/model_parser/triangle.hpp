//
//  triangle.hpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#ifndef triangle_hpp
#define triangle_hpp

#include "glm/glm.hpp"
#include <vector>

class Triangle {
public:
    std::vector<glm::vec3> corners;
    glm::vec3 centroid;
    
    void make_centroid();
};

#endif /* triangle_hpp */
