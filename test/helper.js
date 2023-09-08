'use strict'

const path = require('path')
const { EventEmitter } = require('events')

const facCaller = new class FacCaller extends EventEmitter {
  constructor () {
    super()
    this.ctx = { root: path.join(__dirname, '') }
  }
}()

module.exports = {
  facCaller
}
