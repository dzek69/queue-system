require("@babel/polyfill");
require("@babel/register")({
    extends: "./.babelrc.cjs",
    ignore: [],
});
const must = require("must/register");

global.must = must;
