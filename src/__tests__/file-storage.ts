import Writer, { ArrayWriter, BufferStorage } from "../writer";

test("file-storage - one row, one column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Writer<Buffer>(4, 1, buffer);
    await storage.open();
    await storage.write("foo", 0, 0);
    const contents = await storage.close();

    expect(contents.toString()).toBe(`foo \n`);
});

test("file-storage - two row, one column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Writer<Buffer>(4, 1, buffer);

    await storage.open();
    await storage.write("foo", 1, 0);
    const contents = await storage.close();
    const expected = `    \nfoo \n`

    expect(contents.toString()).toBe(expected);
});

test("file-storage - one row, two column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Writer<Buffer>(4, 2, buffer);

    await storage.open();
    await storage.write("foo", 1, 1);
    const contents = await storage.close();
    const expected = `    ,    \n    ,foo \n`

    expect(contents.toString()).toBe(expected);
});

test("file-storage - large", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Writer<Buffer>(4, 3, buffer);

    await storage.open();
    await storage.write("foo", 3, 2);
    const contents = await storage.close();
    const expected = `    ,    ,    \n    ,    ,    \n    ,    ,    \n    ,    ,foo \n`

    expect(contents.toString()).toBe(expected);
});

test("array storage", async () => {

    const storage = new ArrayWriter(4);

    await storage.open();
    await storage.write(123, 3, 2);
    const out = await storage.close();
    const expected = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 123, 0]
    ];

    expect(out).toEqual(expected);
});

test("array storage - add", async () => {

    const storage = new ArrayWriter(4);

    await storage.open();
    await storage.add(123, 3, 2);
    await storage.add(456, 3, 2);
    const out = await storage.close();
    const expected = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 123 + 456, 0]
    ];

    expect(out).toEqual(expected);
});

test("array storage - forEach", async () => {

    const storage = new ArrayWriter(4);

    await storage.open();
    await storage.add(123, 1, 3);

    storage.forEach((row, idx) => {
        if (idx === 1) {
            expect(row).toEqual([0, 0, 0, 123]);
        } else {
            expect(row).toEqual([0, 0, 0, 0]);
        }
    });
});
