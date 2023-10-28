from config import *

class Node:

    def __init__(self) :
        
        self.minCorner: np.ndarray = pyrr.vector3.create(dtype = np.float32)
        self.leftChild: int = 0
        self.maxCorner: np.ndarray = pyrr.vector3.create(dtype = np.float32)
        self.primitiveCount: int = 0