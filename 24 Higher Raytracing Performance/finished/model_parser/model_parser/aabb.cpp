//
//  aabb.cpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#include "aabb.hpp"

AABB::AABB() {
    minCorner = glm::vec3( 999999,  999999,  999999);
    maxCorner = glm::vec3(-999999, -999999, -999999);
}

void AABB::make_planes() {
    
    //x-
    normals[0] = glm::vec3(1.0f, 0.0f, 0.0f);
    D[0] = -glm::dot(minCorner, normals[0]);
    
    //y-
    normals[1] = glm::vec3(0.0f, 1.0f, 0.0f);
    D[1] = -glm::dot(minCorner, normals[1]);
    
    //z-
    normals[2] = glm::vec3(0.0f, 0.0f, 1.0f);
    D[2] = -glm::dot(minCorner, normals[2]);
    
    //x+
    normals[3] = glm::vec3(-1.0f, 0.0f, 0.0f);
    D[3] = -glm::dot(maxCorner, normals[3]);
    
    //y+
    normals[4] = glm::vec3(0.0f, -1.0f, 0.0f);
    D[4] = -glm::dot(maxCorner, normals[4]);
    
    //z+
    normals[5] = glm::vec3(0.0f, 0.0f, -1.0f);
    D[5] = -glm::dot(maxCorner, normals[5]);
}

void AABB::grow(glm::vec3& corner) {
    minCorner = glm::min(minCorner, corner);
    maxCorner = glm::max(maxCorner, corner);
}

float AABB::surface_area() {
    
    glm::vec3 extent = maxCorner - minCorner;
    
    return extent[0] * extent[1]
            + extent[0] * extent[2]
            + extent[1] * extent[2];
}

bool AABB::contains(glm::vec3& point) {
    
    for (int i = 0; i < 3; ++i) {
        if (point[i] < minCorner[i] || point[i] > maxCorner[i]) {
            return false;
        }
    }
    
    return true;
}

std::vector<glm::vec3> AABB::clip_polygon(std::vector<glm::vec3> input) {
    
    for (int i = 0; i < 6; ++i) {
        input = clip_against_plane(i, input);
    }
    
    return input;
}

std::vector<glm::vec3> AABB::clip_against_plane(int i, std::vector<glm::vec3>& input) {
    
    std::vector<glm::vec3> output;
    
    for (int j = 0; j < input.size(); ++j) {
        glm::vec3 point_a = input[j];
        glm::vec3 point_b = input[(j + 1) % input.size()];
        glm::vec3 point_c = intersection_point(i, point_a, point_b);
        
        if (!behind_plane(i, point_b)) {
            if (behind_plane(i, point_a)) {
                if (contains(point_c)) {
                    output.push_back(point_c);
                }
            }
            if (contains(point_b)) {
                output.push_back(point_b);
            }
        }
        else if (behind_plane(i, point_a)) {
            if (contains(point_c)) {
                output.push_back(point_c);
            }
        }
    }
    
    return output;
}

bool AABB::behind_plane(int i, glm::vec3& point) {
    return glm::dot(normals[i], point) + D[i] < 0;
}

glm::vec3 AABB::intersection_point(int i, glm::vec3& point_a, glm::vec3& point_b) {
    
    glm::vec3 direction = point_b - point_a;
    
    float t = -(glm::dot(normals[i], point_a) + D[i]) / glm::dot(normals[i], direction);
    
    return point_a + t * direction;
}
