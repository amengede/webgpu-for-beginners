//
//  obj_mesh.cpp
//  model_parser
//
//  Created by Andrew Mengede on 16/2/2023.
//

#include "obj_mesh.hpp"

ObjMesh::ObjMesh(const char* input_filepath, const char* output_filepath) {
    
    read_file(input_filepath);
    build_bvh();
    write_file(output_filepath);
}

void ObjMesh::read_file(const char* filepath) {
    
    //std::cout << "Read file: " << filepath << std::endl;
    
    std::ifstream file;
    file.open(filepath);
    std::string line;
    
    while(std::getline(file, line)) {
        //std::cout << line << std::endl;
        std::vector<std::string> words = split(line, " ");
        
        if (!words[0].compare("v")) {
            read_vertex_data(words);
        }
        if (!words[0].compare("f")) {
            read_face_data(words);
        }
    }
    
    file.close();
}

std::vector<std::string> ObjMesh::split(
                                        std::string line,
                                        std::string delimiter) {
    
    std::vector<std::string> split_line;
    size_t pos = 0;
    std::string token;
    while ((pos = line.find(delimiter)) != std::string::npos) {
        token = line.substr(0, pos);
        split_line.push_back(token);
        line.erase(0, pos + delimiter.length());
    }
    split_line.push_back(line);
    
    return split_line;
}

void ObjMesh::read_vertex_data(std::vector<std::string>& words) {
    
    glm::vec3 new_vertex =
        glm::vec3(std::stof(words[1]), std::stof(words[2]), std::stof(words[3]));
    
    v.push_back(new_vertex);
    
    minCorner = glm::min(minCorner, new_vertex);
    maxCorner = glm::max(maxCorner, new_vertex);
}

void ObjMesh::read_face_data(std::vector<std::string>& words) {
    
    size_t triangleCount = words.size() - 3;
    
    for (int i = 0; i < triangleCount; ++i) {
        Triangle tri;
        read_corner(words[1], tri);
        read_corner(words[2 + i], tri);
        read_corner(words[3 + i], tri);
        tri.make_centroid();
        triangles.push_back(tri);
    }
}

void ObjMesh::read_corner(std::string& vertex_description, Triangle& tri) {
    std::vector<std::string> v_vt_vn = split(vertex_description, "/");
    glm::vec3 new_vertex = v[std::stoi(v_vt_vn[0]) - 1];
    tri.corners.push_back(new_vertex);
}

void ObjMesh::build_bvh() {
    
    triangleIndices.reserve(triangles.size());
    for (int i = 0; i < triangles.size(); ++i) {
        triangleIndices.push_back(i);
    }
    
    nodes.reserve(2 * triangles.size() - 1);
    
    Node new_node;
    new_node.leftChild = 0;
    new_node.indices.reserve(triangleIndices.size());
    for (int i : triangleIndices) {
        new_node.indices.push_back(i);
    }
    nodes.push_back(new_node);
    
    triangleIndices.clear();
    
    update_bounds(0);
    subdivide(0);
}

void ObjMesh::update_bounds(int nodeIndex) {
    
    Node& node = nodes[nodeIndex];
    node.minCorner = glm::vec3( 999999,  999999,  999999);
    node.maxCorner = glm::vec3(-999999, -999999, -999999);
    
    for (int i = 0; i < node.indices.size(); ++i) {
        Triangle& tri = triangles[node.indices[i]];
        
        for (glm::vec3& corner : tri.corners) {
            node.minCorner = glm::min(node.minCorner, corner);
            node.maxCorner = glm::max(node.maxCorner, corner);
        }
    }
}

void ObjMesh::subdivide(int nodeIndex) {
    
    std::cout << "Splitting node " << nodeIndex << std::endl;
    
    Node& node = nodes[nodeIndex];
    
    if (node.indices.size() < 2) {
        return;
    }
    
    
    int bestAxis = 0;
    float bestPos = 0.0f;
    float bestCost = 999999;
    int sahReorder = 1;
    int splitMethod = 0;
    
    // Object split
    for (int axis = 0; axis < 3; ++axis) {
        int lastProgress = 0;
        for (int i = 0; i < node.indices.size(); ++i) {
            Triangle& tri = triangles[node.indices[i]];
            std::array<float, 2> costs = evaluate_sah_object(node, axis, tri.centroid[axis]);
            float cost = costs[0] + costs[1];
            if (cost < bestCost) {
                bestPos = tri.centroid[axis];
                bestAxis = axis;
                bestCost= cost;
                sahReorder = costs[0] > costs[1] ? 1 : -1;
                std::cout << "New Best Cost: " << bestCost << std::endl;
            }
            int newProgress = static_cast<int>(100.0f * i / node.indices.size());
            if (newProgress > lastProgress) {
                lastProgress = newProgress;
                std::cout << "\t\t<Object Split>Progress: " << lastProgress << "%" << std::endl;
            }
        }
        std::cout << "\t\t<Object Split>Processed axis " << axis + 1 << " out of 3"<< std::endl;
    }
    
    // Spatial split
    glm::vec3 extent = node.maxCorner - node.minCorner;
    for (int axis = 0; axis < 3; ++axis) {
        for (float numerator = 1; numerator < 10; ++numerator) {
            float splitPos = node.minCorner[axis] + (numerator / 10.0f) * extent[axis];
            std::array<float, 2> costs = evaluate_sah_spatial(node, axis, splitPos);
            float cost = costs[0] + costs[1];
            if (cost < bestCost) {
                bestPos = splitPos;
                bestAxis = axis;
                bestCost= cost;
                sahReorder = costs[0] > costs[1] ? 1 : -1;
                splitMethod = 1;
                std::cout << "New Best Cost: " << bestCost << std::endl;
            }
        }
    }
    
    glm::vec3 parentExtent = node.maxCorner - node.minCorner;
    float parentArea = parentExtent[0] * parentExtent[1]
                        + parentExtent[0] * parentExtent[2]
                        + parentExtent[1] * parentExtent[2];
    float parentCost = node.indices.size() * parentArea;
    if (parentCost < bestCost) {
        std::cout << "<Not worth subdividing>" << std::endl;
        return;
    }
    
    if (splitMethod == 0) {
        subdivide_object(nodeIndex, bestAxis, bestPos, sahReorder);
    }
    else {
        subdivide_spatial(nodeIndex, bestAxis, bestPos, sahReorder);
    }
}

void ObjMesh::subdivide_object(
                               int nodeIndex, int axis,
                               float splitPos, int sahReorder) {
    
    std::cout << "<Object Subdivision>" << std::endl;
    
    Node& node = nodes[nodeIndex];
    
    std::vector<int> leftIndices, rightIndices;
    leftIndices.reserve(node.indices.size());
    rightIndices.reserve(node.indices.size());
    
    for (int i : node.indices) {
        
        if (
            sahReorder * triangles[i].centroid[axis] < sahReorder * splitPos) {
            leftIndices.push_back(i);
        }
        else {
            rightIndices.push_back(i);
        }
    }
    
    if (leftIndices.size() == 0 || leftIndices.size() == node.indices.size()) {
        //std::cout << "Early exit" << std::endl;
        return;
    }
    
    //Left Child
    int leftChildIndex = static_cast<int>(nodes.size());
    
    Node left_child;
    left_child.leftChild = 0;
    left_child.indices.reserve(leftIndices.size());
    for (int index : leftIndices) {
        left_child.indices.push_back(index);
    }
    nodes.push_back(left_child);
    
    //Right Child
    int rightChildIndex = static_cast<int>(nodes.size());
    
    Node right_child;
    right_child.leftChild = 0;
    right_child.indices.reserve(rightIndices.size());
    for (int index : rightIndices) {
        right_child.indices.push_back(index);
    }
    nodes.push_back(right_child);
    
    nodes[nodeIndex].leftChild = leftChildIndex;
    nodes[nodeIndex].indices.clear();
    
    update_bounds(leftChildIndex);
    update_bounds(rightChildIndex);
    subdivide(leftChildIndex);
    subdivide(rightChildIndex);
}

void ObjMesh::subdivide_spatial(
                               int nodeIndex, int axis,
                               float splitPos, int sahReorder) {
    Node& node = nodes[nodeIndex];
    
    spatialSplitCount += 1;
    
    std::cout << "<Spatial Subdivision>" << std::endl;
    
    AABB leftBox, rightBox;
    leftBox.minCorner = node.minCorner;
    leftBox.maxCorner = node.maxCorner;
    leftBox.maxCorner[axis] = splitPos;
    leftBox.make_planes();
    
    rightBox.minCorner = node.minCorner;
    rightBox.maxCorner = node.maxCorner;
    rightBox.minCorner[axis] = splitPos;
    rightBox.make_planes();
    
    //A set of all the indices to add for both boxes
    std::vector<int> leftIndices;
    leftIndices.reserve(node.indices.size());
    std::vector<int> rightIndices;
    rightIndices.reserve(node.indices.size());
    
    AABB tightLeft, tightRight;
    
    for (int i : node.indices) {
        Triangle& tri = triangles[i];
        
        //Get the edgetable
        std::vector<glm::vec3> polygon;
        polygon.push_back(tri.corners[0]);
        polygon.push_back(tri.corners[1]);
        polygon.push_back(tri.corners[2]);
        
        std::vector<glm::vec3> pointsInLeftBox = leftBox.clip_polygon(polygon);
        
        if (pointsInLeftBox.size() > 0) {
            
            leftIndices.push_back(i);
            
            for (glm::vec3 point : pointsInLeftBox) {
                tightLeft.grow(point);
            }
        }
        
        std::vector<glm::vec3> pointsInRightBox = rightBox.clip_polygon(polygon);
        
        if (pointsInRightBox.size() > 0) {
            
            rightIndices.push_back(i);
            
            for (glm::vec3 point : pointsInRightBox) {
                tightRight.grow(point);
            }
        }
        
    }
    
    //Left Child
    int leftChildIndex = static_cast<int>(nodes.size());
    
    Node left_child;
    left_child.leftChild = 0;
    left_child.indices.reserve(leftIndices.size());
    left_child.minCorner = tightLeft.minCorner;
    left_child.maxCorner = tightLeft.maxCorner;
    for (int index : leftIndices) {
        left_child.indices.push_back(index);
    }
    nodes.push_back(left_child);
    
    //Right Child
    int rightChildIndex = static_cast<int>(nodes.size());
    
    Node right_child;
    right_child.leftChild = 0;
    right_child.indices.reserve(rightIndices.size());
    right_child.minCorner = tightRight.minCorner;
    right_child.maxCorner = tightRight.maxCorner;
    for (int index : rightIndices) {
        right_child.indices.push_back(index);
    }
    nodes.push_back(right_child);
    
    nodes[nodeIndex].leftChild = leftChildIndex;
    nodes[nodeIndex].indices.clear();
    
    subdivide(leftChildIndex);
    subdivide(rightChildIndex);
}

std::array<float,2> ObjMesh::evaluate_sah_object(Node& node, int axis, float split_pos) {
    
    AABB leftBox, rightBox;
    
    int leftCount = 0, rightCount = 0;
    
    for (int i : node.indices) {
        Triangle& tri = triangles[i];
        
        if (tri.centroid[axis] < split_pos) {
            leftCount++;
            for (glm::vec3& corner : tri.corners) {
                leftBox.grow(corner);
            }
        }
        else {
            rightCount++;
            for (glm::vec3& corner : tri.corners) {
                rightBox.grow(corner);
            }
        }
    }
    
    std::array<float,2> costs;
    costs[0] = leftCount * leftBox.surface_area();
    costs[0] = costs[0] > 0? costs[0] : 999999;
    costs[1] = rightCount * rightBox.surface_area();
    costs[1] = costs[1] > 0? costs[1] : 999999;
    
    return costs;
}

std::array<float,2> ObjMesh::evaluate_sah_spatial(Node& node, int axis, float split_pos) {
    
    bool debug = false;
    
    AABB leftBox, rightBox;
    leftBox.minCorner = node.minCorner;
    leftBox.maxCorner = node.maxCorner;
    leftBox.maxCorner[axis] = split_pos;
    leftBox.make_planes();
    
    if (debug) {
        std::cout << "Left Box: "
        << "(" << leftBox.minCorner[0]
        << ", " << leftBox.minCorner[1]
        << ", " << leftBox.minCorner[2] << ") -> "
        << "(" << leftBox.maxCorner[0]
        << ", " << leftBox.maxCorner[1]
        << ", " << leftBox.maxCorner[2] << ")" << std::endl;
    }
    
    rightBox.minCorner = node.minCorner;
    rightBox.maxCorner = node.maxCorner;
    rightBox.minCorner[axis] = split_pos;
    rightBox.make_planes();
    
    if (debug) {
        std::cout << "Right Box: "
        << "(" << rightBox.minCorner[0]
        << ", " << rightBox.minCorner[1]
        << ", " << rightBox.minCorner[2] << ") -> "
        << "(" << rightBox.maxCorner[0]
        << ", " << rightBox.maxCorner[1]
        << ", " << rightBox.maxCorner[2] << ")" << std::endl;
    }
    
    AABB tightLeft, tightRight;
    
    int leftCount = 0, rightCount = 0;
    
    for (int i : node.indices) {
        Triangle& tri = triangles[i];
        
        //Get the edgetable
        std::vector<glm::vec3> polygon;
        polygon.push_back(tri.corners[0]);
        polygon.push_back(tri.corners[1]);
        polygon.push_back(tri.corners[2]);
        
        std::vector<glm::vec3> pointsInLeftBox = leftBox.clip_polygon(polygon);
        
        if (debug) {
            std::cout << "Left box has " << pointsInLeftBox.size() << " points:" <<std::endl;
            
            for (glm::vec3 point : pointsInLeftBox) {
                std::cout << "\t(" << point[0]
                << ", " << point[1]
                << ", " << point[2] << ")" << std::endl;
            }
        }
        
        if (pointsInLeftBox.size() > 0) {
            leftCount++;
            
            for (glm::vec3 point : pointsInLeftBox) {
                tightLeft.grow(point);
            }
        }
        
        std::vector<glm::vec3> pointsInRightBox = rightBox.clip_polygon(polygon);
        
        if (debug) {
            std::cout << "Right box has " << pointsInRightBox.size() << " points:" <<std::endl;
            
            for (glm::vec3 point : pointsInRightBox) {
                std::cout << "\t(" << point[0]
                << ", " << point[1]
                << ", " << point[2] << ")" << std::endl;
            }
        }
        
        if (pointsInRightBox.size() > 0) {
            rightCount++;
            
            for (glm::vec3 point : pointsInRightBox) {
                tightRight.grow(point);
            }
        }
        
    }
    
    std::array<float,2> costs;
    costs[0] = leftCount * tightLeft.surface_area();
    //costs[0] = leftCount * leftBox.surface_area();
    costs[0] = costs[0] > 0? costs[0] : 999999;
    costs[1] = rightCount * tightRight.surface_area();
    //costs[1] = rightCount * rightBox.surface_area();
    costs[1] = costs[1] > 0? costs[1] : 999999;
    
    return costs;
}

void ObjMesh::write_file(const char* filepath) {
    
    std::cout << "Spatial split performed " << spatialSplitCount << " times." << std::endl;
    
    std::ofstream file;
    file.open(filepath);
    
    //minCorner
    file << "min "
        << minCorner[0] << " "
        << minCorner[1] << " "
        << minCorner[2] << std::endl;
    
    //maxCorner
    file << "max "
        << maxCorner[0] << " "
        << maxCorner[1] << " "
        << maxCorner[2] << std::endl;
    
    //nodesUsed
    file << "nodes " << nodes.size() << std::endl;
    
    //nodes
    for (Node& node : nodes) {
        
        int indexOffset = 0;
        if (node.indices.size() > 0) {
            
            //Tell the node where its indices start
            indexOffset = static_cast<int>(triangleIndices.size());
            
            //Copy indices into array
            for (int index: node.indices) {
                triangleIndices.push_back(index);
            }
        }
        file << "node"
            << " " << node.minCorner[0]
            << " " << node.minCorner[1]
            << " " << node.minCorner[2]
            << " " << node.maxCorner[0]
            << " " << node.maxCorner[1]
            << " " << node.maxCorner[2]
            << " " << node.leftChild + indexOffset
            << " " << node.indices.size() << std::endl;
    }
    
    for (int index : triangleIndices) {
        file << "triIndex " << index << std::endl;
    }
    
    file.close();
}
