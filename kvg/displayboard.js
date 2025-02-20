// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: bus-alt;

// Configuration
const stopId = "1643"
const maxEntries = 6
const maxChars = 14

// Column width configuration
const lineWidth = 6
const destinationWidth = maxChars
const timeWidth = 14

// UI Configuration
const bgColor = new Color("#000000")
const lineFont = new Font("Menlo", 14)
const footerFont = new Font("Helvetica", 13)
const errorFont = new Font("Helvetica-Bold", 14)

// API Configuration
const apiUrl = "https://kvg-internetservice-proxy.p.networkteam.com/internetservice/services/passageInfo/stopPassages/stop"

// Main function
async function main() {
  try {
    const departures = await fetchDepartures()
    const widget = await createWidget(departures)
    
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

// Fetch departure data from KVG API
async function fetchDepartures() {
  try {
    const request = new Request(apiUrl)
    request.method = "POST"
    request.headers = {
      "Content-Type": "application/x-www-form-urlencoded"
    }
    request.body = `stop=${stopId}`
    
    const json = await request.loadJSON()
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid API response format')
    }
    
    return json.actual || []
  } catch (error) {
    if (error.message.includes('The request timed out')) {
      throw new Error('Request timeout, please check your network connection')
    } else if (error.message.includes('The Internet connection appears to be offline')) {
      throw new Error('Network connection is offline')
    } else {
      throw new Error(`Failed to fetch data: ${error.message}`)
    }
  }
}

// Create widget with departure information
async function createWidget(departures) {
  const widget = new ListWidget()
  widget.backgroundColor = bgColor
  
  if (!departures || departures.length === 0) {
    const noDataText = widget.addText('No departures available')
    noDataText.font = errorFont
    noDataText.textColor = Color.white()
    widget.addSpacer()
    const footer = widget.addText(`Last update: ${formatCurrentTime()}`)
    footer.font = footerFont
    footer.textColor = Color.white()
    return widget
  }
  
  // Use column width variables in createWidget function
  // Add column headers
  const headers = widget.addText(`${"Line".padEnd(lineWidth)}${"Destination".padEnd(destinationWidth)}${"Time".padEnd(timeWidth)}Status`)
  
  headers.font = lineFont
  headers.textColor = Color.white()
  
  widget.addSpacer(5)
  
  let count = 0
  
  for (const departure of departures) {
    if (count >= maxEntries) break
    
    const lineNumber = (departure.patternText || "").padEnd(lineWidth)
    const destination = (departure.direction || "").trim().slice(0, destinationWidth).padEnd(destinationWidth)
    
    // Define time and countdown before using them
    const time = departure.actualTime || "--:--"
    const countdown = departure.actualRelativeTime
      ? (departure.actualRelativeTime < 60
        ? `${departure.actualRelativeTime}s`
        : `${Math.floor(departure.actualRelativeTime / 60)}m`)
      : "--"
    const timeStr = `${time} (${countdown})`.padEnd(timeWidth)
    
    const status = departure.status
      ? (departure.status === "PLANNED" ? "P"
        : departure.status === "PREDICTED" ? "PR"
        : departure.status === "STOPPING" ? "S"
        : departure.status === "DEPARTED" ? "D"
        : departure.status)
      : "--"
    
    const line = widget.addText(
      `${lineNumber}${destination}${timeStr}${status}`
    )
    line.font = lineFont
    line.textColor = Color.white()
    
    count++
  }
  
  widget.addSpacer(10)
  
  const footer = widget.addText(`Updated: ${formatCurrentTime()}`)
  footer.font = footerFont
  footer.textColor = Color.white()
  
  return widget
}

// Create error widget
async function createErrorWidget(errorMessage) {
  const widget = new ListWidget()
  widget.backgroundColor = bgColor
  
  const errorText = widget.addText(errorMessage)
  errorText.font = errorFont
  errorText.textColor = Color.red()
  
  widget.addSpacer()
  
  const footer = widget.addText(`Updated: ${formatCurrentTime()}`)
  footer.font = footerFont
  footer.textColor = Color.white()
  
  return widget
}

// Format time string from minutes to HH:MM format
function formatTime(minutes) {
  if (!minutes) return "--:--"
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

// Get current time in HH:MM:SS format
function formatCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

// Run the script
await main()