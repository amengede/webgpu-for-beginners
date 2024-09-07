//
//  node.hpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#ifndef node_hpp
#define node_hpp

#include "glm/glm.hpp"
#include <vector>

class Node {
    
public:
    glm::vec3 minCorner = glm::vec3(0,0,0);
    int leftChild = 0;
    glm::vec3 maxCorner = glm::vec3(0,0,0);
    std::vector<int> indices;
};

#endif /* node_hpp */
