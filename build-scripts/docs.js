const { ensureDir, remove, copy } = require("fs-extra");
const { additionalTutorialFiles } = require("./docs.config");
const { prepareCopyList } = require("./docs/utils");

(async () => {
    try {
        const tasks = [
            remove("docs"),
            ensureDir("tutorials"),
        ];

        await Promise.all(tasks);

        const copyList = prepareCopyList(additionalTutorialFiles);
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
