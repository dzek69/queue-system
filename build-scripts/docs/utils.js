const { join } = require("path");

const prepareCopyList = (filesToCopy) => {
    return filesToCopy.map(source => {
        const filePathParts = source.split("/");
        const fileName = filePathParts[filePathParts.length - 1];

        const target = join("tutorials", fileName);

        return { source, target };
    });
};

module.exports = {
    prepareCopyList,
};
