export function print(name: string, buffer: Buffer | string) {
    console.log(`${name}: "${buffer.toString().replaceAll(" ", "_")}"`);
}

