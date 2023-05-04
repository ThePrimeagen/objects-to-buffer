import fs from "fs/promises";

const whitespace = " ".charCodeAt(0);
const comma = ",".charCodeAt(0);
const newLine = "\n".charCodeAt(0);

export interface IStorage<T> {
    open(path?: string): Promise<void>;
    close(): Promise<T>;
    write(data: string, byteOffset: number): Promise<void>;
    //add(data: string, row: number, column: number): Promise<this>;
}

export interface IWriter<T> {
    open(): Promise<void>;
    close(): Promise<T>;
    write(data: string | number, row: number, column: number): Promise<void>;
    add(data: string | number, row: number, column: number): Promise<void>;
    carryForwardColumn(column: number): Promise<void>;
    forEach(callback: (columns: number[]) => void): Promise<void>;
}

export class BufferStorage implements IStorage<Buffer> {
    private buffer: Buffer;
    private maxByteWritten = 0;

    constructor(private size: number) {
        this.buffer = Buffer.alloc(size, whitespace);
    }

    async open(): Promise<void> { }

    async close(): Promise<Buffer> {
        return this.buffer.subarray(0, this.maxByteWritten);
    }

    async write(data: string | Buffer, byteOffset: number): Promise<void> {
        if (this.size < byteOffset + data.length) {
            throw new Error(`initial buffer size of ${this.size} is too small to write ${data.length} bytes at ${byteOffset}`);
        }

        if (typeof data === "string") {
            this.buffer.write(data, byteOffset);
        } else {
            data.copy(this.buffer, byteOffset);
        }


        if (this.maxByteWritten < byteOffset + data.length) {
            this.maxByteWritten = byteOffset + data.length;
        }
    }
}

export class FileStorage implements IStorage<void> {
    private file!: fs.FileHandle;
    private closed: boolean = true;

    async open(path?: string): Promise<void> {
        if (!path) {
            throw new Error("FileStorage requires a path to be provide");
        }

        this.closed = false;

        // TODO: Hydrate stats from file
        this.file = await fs.open(path, "w+");
    }

    async close(): Promise<void> {
        if (this.closed) {
            throw new Error("cannot close storage twice");
        }
        await this.file.close();
    }
    async write(data: string, byteOffset: number): Promise<void> {
        if (this.closed) {
            throw new Error("cannot write a closed storage");
        }
        await this.file.write(data, byteOffset);
    }

}

export default class Writer<T> implements IWriter<T> {
    private rowWidth: number;
    private maxRow;

    constructor(private cellWidth: number, private columns: number, private storage: IStorage<Buffer> = new BufferStorage(1024 * 1024)) {
        this.rowWidth =
            // data space
            cellWidth * columns +

            // commas
            columns - 1 +

            // new line
            1;

        this.maxRow = -1;
    }

    async add(data: string, row: number, column: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async carryForwardColumn(column: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async forEach(callback: (columns: number[]) => void): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async open(path?: string): Promise<void> {
        await this.storage.open(path);
    }

    async close(): Promise<T> {
        return this.storage.close() as T;
    }

    async write(data: string | number, row: number, column: number): Promise<void> {
        data = data.toString();

        this.grow(row);

        if (data.length > this.cellWidth) {
            throw new Error("unable to insert data");
        }

        const rowOffset = row * this.rowWidth;
        const columnOffset = column * this.cellWidth + column;

        await this.storage.write(data, rowOffset + columnOffset);
    }

    private async grow(to: number): Promise<void> {
        if (to <= this.maxRow) {
            return;
        }

        const amount = to - this.maxRow;
        const bytes = Buffer.alloc(this.rowWidth * amount).fill(whitespace);

        for (let i = 0; i < amount; ++i) {
            for (let j = 1; j < this.columns; ++j) {
                bytes.writeUInt8(comma, i * this.rowWidth + j * this.cellWidth + j - 1);
            }
            bytes.writeUInt8(newLine, i * this.rowWidth + this.rowWidth - 1);
        }

        // interface to write is better with string than buffer
        const toWrite = bytes.toString("utf-8");

        await this.storage.write(toWrite, (this.maxRow + 1) * this.rowWidth);
        this.maxRow = amount;
    }
}

export class ArrayWriter implements IWriter<number[][]> {
    private view: Float64Array;
    private maxRow: number = -1;
    constructor(private columnCount: number) {
        this.view = new Float64Array(columnCount * 10);
    }

    async forEach(callback: (columns: number[], row: number) => void): Promise<void> {
        for (let i = 0; i <= this.maxRow; ++i) {
            callback(this.getRow(i), i);
        }
    }

    async open(): Promise<void> {}

    async close(): Promise<number[][]> {
        const out: number[][] = [];
        for (let i = 0; i <= this.maxRow; ++i) {
            out.push(this.getRow(i));
        }
        return out;
    }

    async write(d: string | number, row: number, column: number): Promise<void> {
        const data = +d;
        if (this.maxRow < row) {
            this.maxRow = row;
        }
        this.grow(row);
        this.view[this.offset(row, column)] = data;
    }

    async add(d: string | number, row: number, column: number): Promise<void> {
        const data = +d;
        if (this.maxRow < row) {
            this.maxRow = row;
        }
        this.grow(row);
        this.view[this.offset(row, column)] += data;
    }

    async carryForwardColumn(column: number): Promise<void> {
        let previous: number = 0;
        for (let i = 0; i < this.maxRow; ++i) {
            const offset = this.offset(i, column);
            const curr = this.view[offset];
            if (previous === 0) {
                previous = curr;
            } else if (curr === 0 && previous !== 0) {
                this.view[offset] = previous;
            } else {
                previous = curr;
            }
        }
    }

    private offset(row: number, column: number): number {
        return row * this.columnCount + column;
    }

    private grow(row: number): void {
        const offset = this.offset(row, 0);

        if (offset < this.view.length) {
            return;
        }

        const newView = new Float64Array(this.view.length * 2);
        newView.set(this.view);
    }

    private getRow(r: number): number[] {
        const row: number[] = [];
        for (let col = 0; col < this.columnCount; ++col) {
            row.push(this.view[this.offset(r, col)]);
        }
        return row;
    }
}


