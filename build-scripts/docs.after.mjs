import fs from "fs-extra";
import config from "./docs.config.mjs";
import { prepareCopyList } from "./docs/utils.mjs";

(async () => {
    try {
        const copyList = prepareCopyList(config.additionalTutorialFiles);
        const removeJobs = copyList.map(({ source, target }) => {
            return fs.remove(target);
        });

        await Promise.all(removeJobs);

        console.info("OK: Cleaned up temp tutorial files");
    }
    catch (error) {
        console.error("There was a problem with generating docs cleanup: ", error);
        process.exit(1);
    }
})();
