const config = {
    presets: [
        [
            "@babel/env",
            {
                "targets": {
                    "browsers": [
                        "> 3%"
                    ]
                },
                "useBuiltIns": "entry",
                "corejs": 2
            }
        ]
    ],
    plugins: [
        ["module-extension", { mjs: "" }]
    ].filter(Boolean),
};

module.exports = config;
