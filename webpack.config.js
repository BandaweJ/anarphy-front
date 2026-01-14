module.exports = {
  ignoreWarnings: [
    {
      module: /node_modules\/canvg/,
      message: /CommonJS or AMD dependencies/,
    },
    {
      module: /node_modules\/core-js/,
      message: /CommonJS or AMD dependencies/,
    },
  ],
};

