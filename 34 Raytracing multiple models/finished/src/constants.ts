export enum COARSE_PARTITION_TYPE {
    NODES,
    LOOKUP,
};

export enum FINE_PARTITION_TYPE {
    TLAS,
    ALICE,
    BALL,
    BOARD,
    CORNER,
    CUBE,
    DEMON,
    GIRL2,
    GIRL3,
    HANDS,
    PLANT,
    SKULL,
    STATUE,
    TREE,
    WALL,
}

let filenames: Map<FINE_PARTITION_TYPE, string> = new Map([
    [FINE_PARTITION_TYPE.ALICE, "dist/models/alice.obj"],
    [FINE_PARTITION_TYPE.BALL, "dist/models/ball.obj"],
    [FINE_PARTITION_TYPE.BOARD, "dist/models/board.obj"],
    [FINE_PARTITION_TYPE.CORNER, "dist/models/corner.obj"],
    [FINE_PARTITION_TYPE.CUBE, "dist/models/cube.obj"],
    [FINE_PARTITION_TYPE.DEMON, "dist/models/demon.obj"],
    [FINE_PARTITION_TYPE.GIRL2, "dist/models/girl2.obj"],
    [FINE_PARTITION_TYPE.GIRL3, "dist/models/girl3.obj"],
    [FINE_PARTITION_TYPE.HANDS, "dist/models/hands.obj"],
    [FINE_PARTITION_TYPE.PLANT, "dist/models/Plant_001.obj"],
    [FINE_PARTITION_TYPE.SKULL, "dist/models/skull.obj"],
    [FINE_PARTITION_TYPE.STATUE, "dist/models/statue.obj"],
    [FINE_PARTITION_TYPE.TREE, "dist/models/tree.obj"],
    [FINE_PARTITION_TYPE.WALL, "dist/models/wall.obj"],
]);

let scales: Map<FINE_PARTITION_TYPE, number> = new Map([
    [FINE_PARTITION_TYPE.ALICE, 0.01],
    [FINE_PARTITION_TYPE.BALL, 0.1],
    [FINE_PARTITION_TYPE.BOARD, 0.01],
    [FINE_PARTITION_TYPE.CORNER, 1.0],
    [FINE_PARTITION_TYPE.CUBE, 1.0],
    [FINE_PARTITION_TYPE.DEMON, 1.0],
    [FINE_PARTITION_TYPE.GIRL2, 1.5],
    [FINE_PARTITION_TYPE.GIRL3, 2.0],
    [FINE_PARTITION_TYPE.HANDS, 2.0],
    [FINE_PARTITION_TYPE.PLANT, 0.01],
    [FINE_PARTITION_TYPE.SKULL, 1.0],
    [FINE_PARTITION_TYPE.STATUE, 1.0],
    [FINE_PARTITION_TYPE.TREE, 1.0],
    [FINE_PARTITION_TYPE.WALL, 0.1],
]);

let object_type_count = 14;

export { filenames, scales, object_type_count };