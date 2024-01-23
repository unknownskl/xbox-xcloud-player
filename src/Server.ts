import 'dotenv/config'
import express from 'express'
import bodyParser from 'body-parser'
import proxy from 'express-http-proxy'
import https from 'https'
import fs from 'fs'

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

        if(Manager.token !== '') {
            // Use xal-auth token
            process.env.GS_TOKEN = Manager.token
        } else {
            if(process.env.GS_TOKEN === undefined || process.env.GS_TOKEN === ''){
                console.log('GS_TOKEN is empty, falling back on xal-authentication...')
    
                if(! fs.existsSync('./.xbox.tokens.json')){
                    console.log('.xbox.tokens.json not found. Please set the GS_TOKEN environment variable or run \'npm run auth\' to login')
                    process.exit()
                } else {
                    Manager.requestxHomeToken(JSON.parse(fs.readFileSync('./.xbox.tokens.json').toString()).xsts_token.Token).then((response:any) => {
                        console.log('response', response)
                        Manager.token = response.gsToken
                        process.env.GS_TOKEN = response.gsToken
                    }).catch(() => {
                        console.log('Failed to authenticate with xHome. Please re-run \'npm run auth\' to refresh your tokens.')
                        process.exit()
                    })
                }
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
    token = ''

    requestxHomeToken(streamingToken){
        return new Promise((resolve, reject) => {
            // this._application.log('authentication', __filename+'[requestxHomeToken()] Requesting xHome streaming tokens')

            // Get xHomeStreaming Token
            const data = JSON.stringify({
                'token': streamingToken,
                'offeringId': 'xhome',
            })
        
            const options = {
                hostname: 'xhome.gssv-play-prod.xboxlive.com',
                method: 'POST',
                path: '/v2/login/user',
            }

            this.request(options, data).then((response:any) => {
                resolve(response)
            }).catch((error) => {
                console.log('authentication', __filename+'[requestxHomeToken()] xHome token retrieval error:', error)
                reject(error)
            })
        })
    }

    request(options, data, headers = {}) {

        return new Promise((resolve, reject) => {
            const reqOptions = {
                hostname: '',
                port: 443,
                path: '',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                    'x-gssv-client': 'XboxComBrowser',
                    ...headers,
                },
                ...options,
            }
            const req = https.request(reqOptions, (res) => {
                let responseData = ''
                
                res.on('data', (data) => {
                    responseData += data
                })
        
                res.on('close', () => {
                    if(res.statusCode === 200){
                        const response = JSON.parse(responseData.toString())
        
                        resolve(response)
                    } else {
                        console.log('authentication', __filename+'[request()] Request error ['+res.statusCode+']', responseData.toString())
                        reject({
                            status: res.statusCode,
                            body: responseData.toString(),
                        })
                    }
                })
            })
            
            req.on('error', (error) => {
                reject({
                    error: error,
                })
            })

            req.write(data)
            req.end()
        })
    }
}
const Manager = new xHomeTokenManager()