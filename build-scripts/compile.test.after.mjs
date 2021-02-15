import fs from "fs-extra";

const contents = `{"type": "commonjs"}`;

(async () => {
    console.info("[TEST compile post-processing started]");
    await fs.writeFile("./test-out/package.json", contents);
    console.info("Written test-out/package.json with commonjs type fix");
    console.info("[TEST compile post-processing ended]");
})();
