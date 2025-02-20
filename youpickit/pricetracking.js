// Widget Configuration
const CONFIG = {
  // UI Configuration
  ui: {
    bgColor: new Color("#FFFFFF"),
    fonts: {
      line: new Font("Menlo", 14),
      footer: new Font("Helvetica", 13),
      error: new Font("Helvetica-Bold", 14)
    },
    colors: {
      primary: new Color("#007AFF"),
      text: new Color("#000000"),
      secondary: new Color("#666666"),
      error: new Color("#FF0000")
    },
    layout: {
      priceWidth: 8,
      addressWidth: 35,
      maxEntries: 3
    }
  },
  // Brand Logos Configuration
  brandLogos: {
    "Netto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Netto_logo.svg/594px-Netto_logo.svg.png",
    "Rewe": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Logo_REWE.svg/320px-Logo_REWE.svg.png",
    "Edeka": "https://upload.wikimedia.org/wikipedia/de/thumb/9/97/Edeka-wez-logo-2023.svg/320px-Edeka-wez-logo-2023.svg.png",
    "Aldi Nord": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Aldi_Nord_201x_logo.svg/230px-Aldi_Nord_201x_logo.svg.png",
    "Lidl": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl-Logo.svg/240px-Lidl-Logo.svg.png"
  },
  // Location Configuration
  location: {
    latitude: "54,35",
    longitude: "10,12",
    perimeter: "5",
    address: "Kiel"
  },
  // Product Configuration
  productUrl: "https://www.youpickit.de/Produkt/Coca-Cola-Limonade-PET-Flasche-EW-2000/138229/5000112547412"
}

async function fetchPrices() {
  try {
    const request = new Request(CONFIG.productUrl)
    
    // Set required headers with location data
    request.headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'cache-control': 'no-cache',
      'cookie': `CookiesEnabled=1; PersistentCookiesEnabled=1; YpiLocation2=latitude=${CONFIG.location.latitude}&longitude=${CONFIG.location.longitude}&perimeter=${CONFIG.location.perimeter}&address=${CONFIG.location.address};`
    }

    const response = await request.loadString()
    return parsePriceData(response)
  } catch (error) {
    console.error('Price fetching error:', error)
    throw new Error('Failed to fetch price data')
  }
}

/**
 * Parse HTML response and extract price information
 * @param {string} htmlContent - Raw HTML content
 * @returns {Array} Array of price data objects
 */
function parsePriceData(htmlContent) {
  const priceData = []
  const priceBox = htmlContent.match(/<div id="senderPriceBox"[\s\S]*?<\/div>/)
  
  if (!priceBox) return priceData
  
  const options = priceBox[0].match(/<option value="([^"]+)"[^>]*>\s*([\d,]+)\s*&nbsp;*\s*([^<]+)\s*<\/option>/g)
  if (!options) return priceData

  for (const option of options) {
    const [_, value, price, brand] = option.match(/<option value="([^"]+)"[^>]*>\s*([\d,]+)\s*&nbsp;*\s*([^<]+)\s*<\/option>/) || []
    
    if (value && !value.includes('-Bitte auswählen-')) {
      const [_, address] = value.match(/\((.*?)\)/) || []
      if (price && brand && address) {
        priceData.push({
          price: parseFloat(price.trim().replace(/\s+/g, '').replace(',', '.')),
          brand: brand.replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim(),
          address: address.replace(/\s+/g, ' ').trim()
        })
      }
    }
  }
  
  return priceData
}

async function createWidget(priceData) {
  const widget = new ListWidget()
  widget.backgroundColor = CONFIG.ui.bgColor
  
  if (!priceData || priceData.length === 0) {
    return createEmptyWidget(widget)
  }
  
  const lowestPriceEntry = findLowestPrice(priceData)
  await createHeaderSection(widget, lowestPriceEntry)
  await createPriceList(widget, priceData, lowestPriceEntry)
  addFooter(widget)
  
  return widget
}

/**
 * Find the lowest price entry from price data
 * @param {Array} priceData - Array of price entries
 * @returns {Object} Entry with lowest price
 */
function findLowestPrice(priceData) {
  return priceData.reduce((min, current) => 
    current.price < min.price ? current : min
  )
}

/**
 * Create widget header section with best price and brand logo
 * @param {ListWidget} widget - Widget instance
 * @param {Object} lowestPriceEntry - Entry with lowest price
 */
async function createHeaderSection(widget, lowestPriceEntry) {
  const headerStack = widget.addStack()
  headerStack.layoutHorizontally()
  
  // Create left stack for price info
  const leftStack = headerStack.addStack()
  leftStack.layoutVertically()
  leftStack.size = new Size(80, 65)
  
  // Add best price information
  const bestPriceText = leftStack.addText("Best Price")
  bestPriceText.font = Font.boldSystemFont(16)
  bestPriceText.textColor = CONFIG.ui.colors.primary
  
  const priceText = leftStack.addText(`€${lowestPriceEntry.price.toFixed(2)}`)
  priceText.font = Font.boldSystemFont(20)
  priceText.textColor = CONFIG.ui.colors.text
  
  const brandText = leftStack.addText(lowestPriceEntry.brand)
  brandText.font = Font.systemFont(14)
  brandText.textColor = CONFIG.ui.colors.secondary
  
  // Add brand logo if available
  if (CONFIG.brandLogos[lowestPriceEntry.brand]) {
    headerStack.addSpacer()
    const rightStack = headerStack.addStack()
    rightStack.layoutVertically()
    rightStack.size = new Size(200, 65)
    
    const bgImageReq = new Request(CONFIG.brandLogos[lowestPriceEntry.brand])
    const bgImage = await bgImageReq.loadImage()
    const logoImage = rightStack.addImage(bgImage)
    logoImage.imageSize = new Size(200, 65)
    logoImage.cornerRadius = 10
  }
}

/**
 * Create price list section
 * @param {ListWidget} widget - Widget instance
 * @param {Array} priceData - Array of price entries
 * @param {Object} lowestPriceEntry - Entry with lowest price
 */
function createPriceList(widget, priceData, lowestPriceEntry) {
  widget.addSpacer(3)
  
  const othersHeader = widget.addText("Other Prices")
  othersHeader.font = Font.boldSystemFont(14)
  othersHeader.textColor = CONFIG.ui.colors.secondary
  
  widget.addSpacer(5)
  
  let count = 0
  for (const item of priceData) {
    if (count >= CONFIG.ui.layout.maxEntries || item === lowestPriceEntry) continue
    
    const price = `€${item.price.toFixed(2)}`.padEnd(CONFIG.ui.layout.priceWidth)
    const addressParts = item.address.split(',').slice(0, 2)
    const address = addressParts.join(',').slice(0, CONFIG.ui.layout.addressWidth - 1)
      .padEnd(CONFIG.ui.layout.addressWidth)
    
    const line = widget.addText(`${price}${address}`)
    line.font = CONFIG.ui.fonts.line
    line.textColor = CONFIG.ui.colors.text
    
    count++
  }
}

/**
 * Create empty widget when no price data is available
 * @param {ListWidget} widget - Widget instance
 * @returns {ListWidget} Configured widget
 */
function createEmptyWidget(widget) {
  const noDataText = widget.addText('No price data available')
  noDataText.font = CONFIG.ui.fonts.error
  noDataText.textColor = CONFIG.ui.colors.text
  widget.addSpacer()
  addFooter(widget)
  return widget
}

/**
 * Add footer with update time to widget
 * @param {ListWidget} widget - Widget instance
 */
function addFooter(widget) {
  widget.addSpacer(10)
  const footer = widget.addText(`Updated: ${formatCurrentTime()}`)
  footer.font = CONFIG.ui.fonts.footer
  footer.textColor = CONFIG.ui.colors.secondary
}

function formatCurrentTime() {
  const now = new Date()
  return now.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function main() {
  try {
    const priceData = await fetchPrices()
    const widget = await createWidget(priceData)
    
    if (!config.runsInWidget) {
      await widget.presentMedium()
    }
    
    Script.setWidget(widget)
  } catch (error) {
    const errorWidget = await createErrorWidget(error.message)
    if (!config.runsInWidget) {
      await errorWidget.presentMedium()
    }
    Script.setWidget(errorWidget)
  } finally {
    Script.complete()
  }
}

async function createErrorWidget(errorMessage) {
  const widget = new ListWidget()
  widget.backgroundColor = CONFIG.ui.bgColor
  
  const errorText = widget.addText(errorMessage)
  errorText.font = CONFIG.ui.fonts.error
  errorText.textColor = CONFIG.ui.colors.error
  
  widget.addSpacer()
  addFooter(widget)
  
  return widget
}

await main()