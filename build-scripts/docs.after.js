const { remove } = require("fs-extra");
const { additionalTutorialFiles } = require("./docs.config");
const { prepareCopyList } = require("./docs/utils");

(async () => {
    try {
        const copyList = prepareCopyList(additionalTutorialFiles);
        const removeJobs = copyList.map(({ source, target }) => {
            return remove(target);
        });

        await Promise.all(removeJobs);

        console.info("OK: Cleaned up temp tutorial files");
    }
    catch (error) {
        console.error("There was a problem with generating docs cleanup: ", error);
        process.exit(1);
    }
})();
