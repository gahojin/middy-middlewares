/** @type {import('npm-check-updates').RcOptions } */
module.exports = {
  target: (name) => {
    if (name === '@types/node') {
      return 'minor'
    }
    return 'newest'
  },
  cooldown: (name) => {
    return name.startsWith('@gahojin-inc/') ? 0 : 7
  },
}
