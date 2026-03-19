const express = require('express')
const router = express.Router()
const { searchStock, searchSymbol } = require('../controllers/stockController')

router.get('/stock/:symbol', searchStock)
router.get('/search/:query', searchSymbol)

module.exports = router