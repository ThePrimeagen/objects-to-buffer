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

export default class Storage<T> {
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

    async open(path?: string): Promise<this> {
        await this.storage.open(path);
        return this;
    }

    async close(): Promise<T> {
        return this.storage.close() as T;
    }

    async write(data: string, row: number, column: number): Promise<this> {
        this.grow(row);

        if (data.length > this.cellWidth) {
            throw new Error("unable to insert data");
        }

        const rowOffset = row * this.rowWidth;
        const columnOffset = column * this.cellWidth + column;

        await this.storage.write(data, rowOffset + columnOffset);

        return this;
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





