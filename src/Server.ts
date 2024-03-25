import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import proxy from 'express-http-proxy'
import { TokenStore, Xal } from 'xal-node'

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

        if(Manager._tokenxHome !== '') {
            // Use xal-auth token
            process.env.GS_TOKEN = Manager._tokenxHome
        } else {
            if(process.env.GS_TOKEN === undefined || process.env.GS_TOKEN === ''){
                console.log('GS_TOKEN is empty, falling back on xal-authentication...')
                console.log('Failed to authenticate with xHome. Please re-run \'npm run auth\' to refresh your tokens.')
                process.exit()
            }
        }
        

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


///
class xHomeTokenManager {
    _tokenstore:TokenStore
    _xal:Xal

    _tokenxHome:string = ''
    _tokenxCloud:string = ''

    constructor(){
        this._tokenstore = new TokenStore()
        this._tokenstore.load('.xbox.tokens.json')
        this._xal = new Xal(this._tokenstore)
    }

    loadTokens(){
        this.requestxHomeToken().then((tokens) => {
            this._tokenxHome = tokens.xHomeToken.data.gsToken
            this._tokenxCloud = tokens.xCloudToken.data.gsToken

        }).catch(() => {
            console.log('Failed to authenticate with xHome. Please re-run \'npm run auth\' to refresh your tokens.')
            process.exit()
        })
    }

    requestxHomeToken(){
        return this._xal.getStreamingToken(this._tokenstore)
    }
}
const Manager = new xHomeTokenManager()
Manager.loadTokens()