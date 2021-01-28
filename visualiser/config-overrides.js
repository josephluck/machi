const path = require('path')
const { override, babelInclude } = require('customize-cra')

module.exports = (config, env) => 
  Object.assign(
    config,
    override(
      babelInclude([
        path.resolve('src'),
        path.resolve('../../machi'),
      ])
    )(config, env)
  )
  