import fs from "fs-extra";

(async () => {
    const tasks = [
        fs.remove("dist"),
    ];

    try {
        await Promise.all(tasks);
    }
    catch (error) {
        console.error("There was a problem with transpiling: ", error);
        process.exit(1);
    }
})();
