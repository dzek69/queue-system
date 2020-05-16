import fs from "fs-extra";
import path from "path";

(async () => {
    const pkg = JSON.parse(String(await fs.readFile("package.json")));
    if (!pkg.libraryTemplate) {
        console.warn("Cannot find package.json `libraryTemplate` config. Ignoring `default` fix.");
        return;
    }
    if (!pkg.libraryTemplate.fixDefaultForCommonJS) {
        console.info("Setting flag for fixing default export for common JS is not enabled, ignoring `default` fix.");
        return;
    }

    if (!pkg.main) {
        throw new Error("Cannot find package.json `main` entry.");
    }

    const parts = pkg.main.split("/");
    const last = parts[parts.length - 1];
    if (!last.match(/^[a-z\d.]+$/i)) {
        throw new Error("package.json `main` entry should be a file containing latin a-z letters and numbers only.");
    }
    parts[parts.length - 1] = "__" + parts[parts.length - 1];
    const newMain = path.join(...parts);

    await fs.rename(pkg.main, newMain);

    const contents = `
const m = require("./${path.basename(newMain)}");
const def = m.default;
module.exports = def || {};
Object.keys(m).filter(key => key !== "default").forEach(key => {
    module.exports[key] = m[key];
});
`;
    await fs.writeFile(pkg.main, contents.trim());
})().catch(e => {
    console.error(e);
    process.exit(1);
});
