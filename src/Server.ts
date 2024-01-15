import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import proxy from 'express-http-proxy'

const app = express()
const port = 3000

app.use(bodyParser.json())

app.use(express.static('www'))
app.use('/dist', express.static('dist/assets'))

app.listen(port, () => {
    console.log(`Streaming App listening at http://localhost:${port}`)
})

app.get(['/', '/sw.js', '/favicon.ico'], (req, res) => {
    res.send('Server running... <a href="stream.html">Open streaming interface</a>')
})

app.use(proxy('uks.gssv-play-prodxhome.xboxlive.com', {
    https: true,
    proxyReqOptDecorator: function(proxyReqOpts) {
        //   proxyReqOpts.headers = []

        proxyReqOpts.headers['Authorization'] = 'Bearer '+process.env.GS_TOKEN
        proxyReqOpts.headers['Content-Type'] = 'application/json; charset=utf-8'

        return proxyReqOpts
    },
    proxyErrorHandler: function(err, res, next) {
        switch (err && err.code) {
            case 'ECONNRESET': { return res.status(503).send('Proxy error: ECONNRESET') }
            case 'ECONNREFUSED': { return res.status(503).send('Proxy error: ECONNREFUSED') }
            default: { next(err) }
        }
    },
}))