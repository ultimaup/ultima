const UI = require('./ui')

const ui = UI()

let lctr = 0
ui.log.write(`testing line ${lctr}`)
setInterval(() => {
    lctr++
    ui.log.write(`testing line ${lctr}`)
}, 1000)

let ctr = 0
ui.updateBottomBar(`bottom bar ting ${ctr}`)
const lipsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla id metus vel lacus fringilla venenatis. Duis id metus malesuada, pellentesque'
setInterval(() => {
    ctr++
    ui.updateBottomBar(`DB host: localhost:7004 database: joshbalfour-dev-4ef23eb0-1562-4318-b8a5-014dbe071d16\nLive url: https://app-2a529ec3-joshbalfour.dev.onultima.com\nWatching for changes ⠹`)
}, 1000)
