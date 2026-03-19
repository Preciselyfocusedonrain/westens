const axios = require('axios')
const dotenv = require('dotenv')
dotenv.config()

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const ALPHA_KEY = process.env.ALPHA_VANTAGE_API_KEY

const searchStock = async (req, res) => {
  const { symbol } = req.params

  try {
    const yahooResponse = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const meta = yahooResponse.data.chart.result[0].meta

    // Fetch all data, ignore individual failures
    const results = await Promise.allSettled([
      axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`),
      axios.get(`https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${FINNHUB_KEY}`),
      axios.get(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`),
      axios.get(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${ALPHA_KEY}`),
      axios.get(`https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${ALPHA_KEY}`),
      axios.get(`https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${symbol}&apikey=${ALPHA_KEY}`),
      axios.get(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-01-01&to=2025-12-31&token=${FINNHUB_KEY}`),
      axios.get(`https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${FINNHUB_KEY}`),
      axios.get(`https://finnhub.io/api/v1/stock/split?symbol=${symbol}&from=2020-01-01&to=2025-12-31&token=${FINNHUB_KEY}`),
      axios.get(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`)
    ])

    const get = (i) => results[i].status === 'fulfilled' ? results[i].value.data : null

    const profile = get(0)
    const eps = get(1)
    const metrics = get(2)
    const income = get(3)
    const balance = get(4)
    const cashflow = get(5)
    const news = get(6)
    const insider = get(7)
    const splits = get(8)
    const analyst = get(9)

    // DCF Calculation
    let dcfValue = null
    const freeCashFlow = cashflow?.annualReports?.[0]?.operatingCashflow
    const sharesOutstanding = profile?.shareOutstanding

    if (freeCashFlow && sharesOutstanding) {
      const growthRate = 0.05
      const discountRate = 0.10
      const terminalGrowthRate = 0.025
      let totalPV = 0
      let fcf = parseFloat(freeCashFlow)
      for (let i = 1; i <= 5; i++) {
        fcf = fcf * (1 + growthRate)
        totalPV += fcf / Math.pow(1 + discountRate, i)
      }
      const terminalValue = (fcf * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate)
      totalPV += terminalValue / Math.pow(1 + discountRate, 5)
      dcfValue = (totalPV / (sharesOutstanding * 1e6)).toFixed(2)
    }

    res.json({
      success: true,
      data: {
        symbol: meta.symbol,
        name: meta.longName,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        currency: meta.currency,
        exchange: meta.exchangeName,
        profile: profile,
        eps: eps,
        metrics: metrics?.metric,
        dcf: {
          estimatedValue: dcfValue,
          currentPrice: meta.regularMarketPrice,
          upside: dcfValue ? (((dcfValue - meta.regularMarketPrice) / meta.regularMarketPrice) * 100).toFixed(2) + '%' : null
        },
        incomeStatement: income?.annualReports?.slice(0, 4),
        balanceSheet: balance?.annualReports?.slice(0, 4),
        cashFlow: cashflow?.annualReports?.slice(0, 4),
        news: news?.slice(0, 10),
        insiderTrading: insider?.data?.slice(0, 20),
        shareSplits: splits,
        analystRatings: analyst?.slice(0, 6),
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Stock not found or API error',
      error: error.message
    })
  }
}

const searchSymbol = async (req, res) => {
  const { query } = req.params
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_KEY}`
    )
    const results = response.data.result?.slice(0, 8).map(r => ({
      symbol: r.symbol,
      name: r.description,
      type: r.type
    }))
    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { searchStock, searchSymbol }