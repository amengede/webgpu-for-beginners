from config import *

class Triangle:

    def __init__(self):
        self.corners: list[np.ndarray] = []
        self.centroid: np.ndarray = pyrr.vector3.create(dtype = np.float32)

    def make_centroid(self):

        self.centroid = (self.corners[0] + self.corners[1] + self.corners[2]) / 3