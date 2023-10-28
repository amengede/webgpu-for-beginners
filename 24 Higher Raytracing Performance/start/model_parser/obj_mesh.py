from config import *
import triangle
import node

class ObjMesh:

    def __init__(self, input_filepath: str, output_filepath: str):

        self.v: list[np.ndarray] = []

        self.triangles: list[triangle.Triangle] = []

        self.triangleIndices: list[int] = []
        self.nodes: list[node.Node] = []
        self.nodesUsed: int = 0

        self.minCorner: np.ndarray = pyrr.vector3.create(
            x =  999999, y =  999999, z =  999999, dtype = np.float32
        )
        self.maxCorner: np.ndarray = pyrr.vector3.create(
            x = -999999, y = -999999, z = -999999, dtype = np.float32
        )

        self.read_file(input_filepath)
        self.build_bvh()
        self.write_file(output_filepath)

    def read_file(self, filepath: str):

        with open(filepath, "r") as file:

            lines: list[str] = file.readlines()

            for line in lines:
                if (line[0] == "v" and line[1] == " "):
                    self.read_vertex_data(line)
                elif (line[0] == "f"):
                    self.read_face_data(line)

    def read_vertex_data(self, line: str):

        components = line.split(" ")
        #["v", "x", "y", "z"]
        new_vertex: np.ndarray = pyrr.vector3.create(
            x = float(components[1]),
            y = float(components[2]),
            z = float(components[3]),
            dtype = np.float32
        )

        self.v.append(new_vertex)

        self.minCorner = np.minimum(self.minCorner, new_vertex, dtype = np.float32)
        self.maxCorner = np.maximum(self.maxCorner, new_vertex, dtype = np.float32)

    def read_face_data(self, line: str):

        line = line.replace("\n", "")
        vertex_descriptions: list[str] = line.split(" ")
        # ["f", "v1", "v2", ...]
        """
            triangle fan setup, eg.
            v1 v2 v3 v4 => (v1, v2, v3), (v1, v3, v4)

            no. of triangles = no. of vertices - 2
        """
        
        triangle_count: int = len(vertex_descriptions) - 3 #accounting also for "f"
        for i in range(triangle_count):
            tri: triangle.Triangle = triangle.Triangle()
            self.read_corner(vertex_descriptions[1], tri)
            self.read_corner(vertex_descriptions[2 + i], tri)
            self.read_corner(vertex_descriptions[3 + i], tri)
            tri.make_centroid()
            self.triangles.append(tri)

    def read_corner(self, vertex_description: str, tri: triangle.Triangle):
        v_vt_vn: list[str] = vertex_description.split("/")
        v: np.ndarray = self.v[int(v_vt_vn[0]) - 1]
        tri.corners.append(v)

    def build_bvh(self):

        self.triangleIndices = [i for i in range(len(self.triangles))]

        self.nodes = [node.Node() for _ in range(2 * len(self.triangles) - 1)]

        root: node.Node = self.nodes[0]
        root.leftChild = 0
        root.primitiveCount = len(self.triangles)
        self.nodesUsed = 1

        self.update_bounds(0)
        self.subdivide(0)

    def update_bounds(self, nodeIndex: int):

        _node: node.Node = self.nodes[nodeIndex]
        _node.minCorner = pyrr.vector3.create(
            x = 999999, y = 999999, z = 999999, dtype = np.float32
        )
        _node.maxCorner = pyrr.vector3.create(
            x = -999999, y = -999999, z = -999999, dtype = np.float32
        )

        for i in range(_node.primitiveCount):
            _triangle: triangle.Triangle = self.triangles[
                self.triangleIndices[_node.leftChild + i]
            ]

            for corner in _triangle.corners:
                _node.minCorner = np.minimum(_node.minCorner, corner, dtype = np.float32)
                _node.maxCorner = np.maximum(_node.maxCorner, corner, dtype = np.float32)

    def subdivide(self, nodeIndex: int):

        print(f"Splitting node {nodeIndex}")

        _node: node.Node = self.nodes[nodeIndex]

        if (_node.primitiveCount < 2):
            return

        extent: np.ndarray = _node.maxCorner - _node.minCorner
        axis: int = 0
        if (extent[1] > extent[axis]):
            axis = 1
        if (extent[2] > extent[axis]):
            axis = 2

        splitPosition: float = _node.minCorner[axis] + extent[axis] / 2

        i: int = _node.leftChild
        j: int = i + _node.primitiveCount - 1

        while (i <= j):
            if (self.triangles[self.triangleIndices[i]].centroid[axis] < splitPosition):
                i += 1
            else:
                temp: int = self.triangleIndices[i]
                self.triangleIndices[i] = self.triangleIndices[j]
                self.triangleIndices[j] = temp
                j -= 1

        leftCount: int = i - _node.leftChild
        if (leftCount == 0 or leftCount == _node.primitiveCount):
            return

        leftChildIndex: int = self.nodesUsed
        self.nodesUsed += 1
        rightChildIndex: int = self.nodesUsed
        self.nodesUsed += 1

        self.nodes[leftChildIndex].leftChild = _node.leftChild
        self.nodes[leftChildIndex].primitiveCount = leftCount

        self.nodes[rightChildIndex].leftChild = i
        self.nodes[rightChildIndex].primitiveCount = _node.primitiveCount - leftCount

        _node.leftChild = leftChildIndex
        _node.primitiveCount = 0

        self.update_bounds(leftChildIndex)
        self.update_bounds(rightChildIndex)
        self.subdivide(leftChildIndex)
        self.subdivide(rightChildIndex)
    
    def write_file(self, filepath: str):

        with open(filepath, "w") as file:

            #minCorner
            file.write(f"min {self.minCorner[0]} {self.minCorner[1]} {self.minCorner[2]}\n")

            #maxCorner
            file.write(f"max {self.maxCorner[0]} {self.maxCorner[1]} {self.maxCorner[2]}\n")

            #nodesUsed
            file.write(f"nodes {self.nodesUsed}\n")

            #nodes
            for i in range(self.nodesUsed):
                _node: node.Node = self.nodes[i]
                line: str = f"node {_node.minCorner[0]} {_node.minCorner[1]} {_node.minCorner[2]} "
                line += f"{_node.maxCorner[0]} {_node.maxCorner[1]} {_node.maxCorner[2]} "
                line += f"{_node.leftChild} {_node.primitiveCount}\n"
                file.write(line)
            
            #triangleIndices
            for index in self.triangleIndices:
                file.write(f"triIndex {index}\n")