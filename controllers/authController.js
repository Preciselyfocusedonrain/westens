const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const User = require('../models/User')
dotenv.config()

const register = async (req, res) => {
  const { name, email, password } = req.body

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      isPremium: false,
      searchesLeft: 5,
      lastSearchDate: null
    })

    // Create token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isPremium: newUser.isPremium,
        searchesLeft: newUser.searchesLeft
      }
    })

  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body

  try {
    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' })
    }

    // Create token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        searchesLeft: user.searchesLeft
      }
    })

  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { register, login }