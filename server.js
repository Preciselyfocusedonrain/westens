const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const path = require('path')
const connectDB = require('./models/db')
const stockRoutes = require('./routes/stockRoutes')
const authRoutes = require('./routes/authRoutes')
const searchLimit = require('./middleware/searchLimit')

dotenv.config()

connectDB()

const app = express()
app.use(cors())
app.use(express.json())

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// Auth routes
app.use('/api/auth', authRoutes)

// Search autocomplete (NO auth needed)
app.get('/api/search/:query', require('./controllers/stockController').searchSymbol)

// Stock routes (with search limit)
app.get('/api/stock/:symbol', searchLimit, require('./controllers/stockController').searchStock)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Westens server running on port ${PORT}`)
})

module.exports = app