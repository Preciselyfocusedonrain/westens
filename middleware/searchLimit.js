const jwt = require('jsonwebtoken')
const User = require('../models/User')
const dotenv = require('dotenv')
dotenv.config()

const searchLimit = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)
      req.user = user || null
    } else {
      req.user = null
    }
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

module.exports = searchLimit