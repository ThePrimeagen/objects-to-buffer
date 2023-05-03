import { print } from "../print";
import Storage, { BufferStorage } from "../file-storage";

test("file-storage - one row, one column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Storage<Buffer>(4, 1, buffer);
    await storage.open();
    await storage.write("foo", 0, 0);
    const contents = await storage.close();

    expect(contents.toString()).toBe(`foo \n`);
});

test("file-storage - two row, one column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Storage<Buffer>(4, 1, buffer);

    await storage.open();
    await storage.write("foo", 1, 0);
    const contents = await storage.close();
    const expected = `    \nfoo \n`

    expect(contents.toString()).toBe(expected);
});

test("file-storage - one row, two column", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Storage<Buffer>(4, 2, buffer);

    await storage.open();
    await storage.write("foo", 1, 1);
    const contents = await storage.close();
    const expected = `    ,    \n    ,foo \n`

    expect(contents.toString()).toBe(expected);
});

test.only("file-storage - large", async () => {
    const buffer = new BufferStorage(1000);
    const storage = new Storage<Buffer>(4, 3, buffer);

    await storage.open();
    await storage.write("foo", 3, 2);
    const contents = await storage.close();
    const expected = `    ,    ,    \n    ,    ,    \n    ,    ,    \n    ,    ,foo \n`

    expect(contents.toString()).toBe(expected);
});
