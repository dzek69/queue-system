import fs from "fs-extra";
import config from "./docs.config.mjs";
import { prepareCopyList } from "./docs/utils.mjs";

const { ensureDir, remove, copy } = fs;

(async () => {
    try {
        const tasks = [
            remove("docs"),
            ensureDir("tutorials"),
        ];

        await Promise.all(tasks);

        const copyList = prepareCopyList(config.additionalTutorialFiles);
        const copyJobs = copyList.map(({ source, target }) => {
            return copy(source, target);
        });

        await Promise.all(copyJobs);

        console.info("OK: Prepared docs tutorial files");
    }
    catch (error) {
        console.error("There was a problem with generating docs: ", error);
        process.exit(1);
    }
})();
