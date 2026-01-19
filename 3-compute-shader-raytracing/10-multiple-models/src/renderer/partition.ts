export class Partition {

    offset: number;
    size: number;
    payload: number[];

    constructor(offset: number, size: number, payload: number[]){
        this.offset = offset;
        this.size = size;
        this.payload = payload;
    }
}