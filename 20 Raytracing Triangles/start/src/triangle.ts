import { vec3 } from "gl-matrix";

export class Triangle {

    corners: vec3[]
    color: vec3
    centroid: vec3

    build_from_center_and_offsets(center: vec3, offsets: vec3[], color: vec3) {

        this.corners = []
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
}