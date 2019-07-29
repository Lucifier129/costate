const output = {
  useCostate: require('./useCostate'),
  useCoreducer: require('./useCoreducer')
}

module.exports = {
  ...output,
  default: output
}
