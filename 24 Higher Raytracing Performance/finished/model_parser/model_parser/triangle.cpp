//
//  triangle.cpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#include "triangle.hpp"

void Triangle::make_centroid() {
    centroid = (corners[0] + corners[1] + corners[2]) * 1.0f / 3.0f;
}
