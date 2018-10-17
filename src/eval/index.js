module.exports = {
  eval: (js) => Function(`return ${js};`)()
};
