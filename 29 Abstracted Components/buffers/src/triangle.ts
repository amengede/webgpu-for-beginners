import { vec3 } from "gl-matrix";

export class Triangle {

    corners: vec3[]
    normals: vec3[]
    color: vec3
    centroid: vec3
    data: Float32Array

    constructor() {
        this.corners = [];
        this.normals = [];
        this.data = new Float32Array(28);
    }

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

        const edge_ab: vec3 = [
            this.corners[1][0] - this.corners[0][0],
            this.corners[1][1] - this.corners[0][1],
            this.corners[1][2] - this.corners[0][2],
        ]

        const edge_ac: vec3 = [
            this.corners[1][0] - this.corners[0][0],
            this.corners[1][1] - this.corners[0][1],
            this.corners[1][2] - this.corners[0][2],
        ]

        var normal: vec3 = [0,0,0]
        vec3.cross(normal, edge_ab, edge_ac);
        this.normals.push(normal);
        this.normals.push(normal);
        this.normals.push(normal);

        this.color = color;

        for (var corner = 0; corner < 3; corner++) {
            this.data[8 * corner]     = this.corners[corner][0];
            this.data[8 * corner + 1] = this.corners[corner][1];
            this.data[8 * corner + 2] = this.corners[corner][2];

            this.data[8 * corner + 4] = this.normals[corner][0];
            this.data[8 * corner + 5] = this.normals[corner][1];
            this.data[8 * corner + 6] = this.normals[corner][2];
        }
        for (var channel = 0; channel < 3; channel++) {
            this.data[24 + channel] = this.color[channel];
        }
    }

    flatten() {
        for (var corner = 0; corner < 3; corner++) {
            this.data[8 * corner]     = this.corners[corner][0];
            this.data[8 * corner + 1] = this.corners[corner][1];
            this.data[8 * corner + 2] = this.corners[corner][2];

            this.data[8 * corner + 4] = this.normals[corner][0];
            this.data[8 * corner + 5] = this.normals[corner][1];
            this.data[8 * corner + 6] = this.normals[corner][2];
        }
        for (var channel = 0; channel < 3; channel++) {
            this.data[24 + channel] = this.color[channel];
        }
    }

    make_centroid() {
        this.centroid = [
            (this.corners[0][0] + this.corners[1][0] + this.corners[2][0]) / 3,
            (this.corners[0][1] + this.corners[1][1] + this.corners[2][1]) / 3,
            (this.corners[0][2] + this.corners[1][2] + this.corners[2][2]) / 3
        ]
    }
}