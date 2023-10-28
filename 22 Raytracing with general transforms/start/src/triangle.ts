import { vec3 } from "gl-matrix";

export class Triangle {

    //TODO: Add list to store normals at each corner
    corners: vec3[]
    color: vec3
    centroid: vec3

    //TODO: Initialize normals list
    constructor() {
        this.corners = [];
    }

    //TODO: Calculate a single normal for the whole face and store it
    build_from_center_and_offsets(center: vec3, offsets: vec3[], color: vec3) {

        this.centroid = [0, 0, 0]
        const weight: vec3 = [0.33333, 0.33333, 0.33333]

        offsets.forEach(
            (offset: vec3) => {
                var corner: vec3 = 
                [
                    center[0],
                    center[1],
                    center[2]
                ];
                this.corners.push(
                    [
                        corner[0] + offset[0], 
                        corner[1] + offset[1], 
                        corner[2] + offset[2]
                    ]
                );
                var tempCorner: vec3 = [corner[0], corner[1], corner[2]];
                vec3.multiply(tempCorner, tempCorner, weight);
                vec3.add(this.centroid, this.centroid, tempCorner);
            }
        )

        this.color = color;
    }

    make_centroid() {
        this.centroid = [
            (this.corners[0][0] + this.corners[1][0] + this.corners[2][0]) / 3,
            (this.corners[0][1] + this.corners[1][1] + this.corners[2][1]) / 3,
            (this.corners[0][2] + this.corners[1][2] + this.corners[2][2]) / 3
        ]
    }
}