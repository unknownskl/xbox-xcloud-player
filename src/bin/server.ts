import 'dotenv/config'
import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import { TokenStore, Xal, Msal } from 'xal-node'

import ApiClient from '../apiclient'

const app = express()
const port = 3000

app.use(bodyParser.json())
app.disable('x-powered-by')

app.use(express.static('www'))
app.use('/dist', express.static('dist'))

app.listen(port, () => {
    console.log(`Streaming App listening at http://localhost:${port}`)
})

app.get(['/', '/sw.js', '/favicon.ico'], (_req: Request, res: Response) => {
    res.send('Server running... <a href="stream.html">Open streaming interface</a>')
})

class xHomeTokenManager {
    _tokenstore:TokenStore
    _xal:Xal
    _msal:Msal

    _tokenxHome:string = ''
    _tokenxCloud:string = ''

    _apiClient: ApiClient | undefined
    _apiCloudClient: ApiClient | undefined

    constructor(){
        this._tokenstore = new TokenStore()
        this._tokenstore.load('.xbox.tokens.json', true)
        this._xal = new Xal(this._tokenstore)
        this._msal = new Msal(this._tokenstore)
    }

    loadTokens():void{
        this.requestxHomeToken().then((tokens) => {
            this._tokenxHome = tokens.xHomeToken.data.gsToken
            this._tokenxCloud = tokens.xCloudToken.data.gsToken

            if(this._tokenxHome !== null) {console.log('- xHome streaming capable.')} else {console.log('- not xHome streaming capable.')}

            if(this._tokenxCloud !== null) {
                console.log('- xCloud streaming capable.')
                this._apiCloudClient = new ApiClient({ host: tokens.xCloudToken.getDefaultRegion().baseUri, token: this._tokenxCloud })
            } else {
                console.log('- not xCloud streaming capable.')
            }

            console.log('Streaming tokens received. Ready to proxy requests.')
            this._apiClient = new ApiClient({ host: tokens.xHomeToken.getDefaultRegion().baseUri, token: this._tokenxHome })
            this.tokensLoaded()

        }).catch(() => {
            console.log('Failed to authenticate with xHome. Please re-run \'npm run auth\' to refresh your tokens.')
            process.exit()
        })
    }

    requestxHomeToken():ReturnType<Msal['getStreamingTokens']>{
        if(this._tokenstore.getAuthenticationMethod() === 'msal'){
            return this._msal.getStreamingTokens()
        } else {
            return this._xal.getStreamingTokens()
        }
    }

    getMsalToken():ReturnType<Msal['getMsalToken']>{
        if(this._tokenstore.getAuthenticationMethod() === 'msal'){
            return this._msal.getMsalToken()
        } else {
            return this._xal.getMsalToken()
        }
    }

    tokensLoaded():void {
        if(this._xal._xhomeToken === undefined) {return}

        console.log('[PROXY] Proxy requests to:', this._xal._xhomeToken.getDefaultRegion().baseUri.substring(8))
    }
}

const Manager = new xHomeTokenManager()
Manager.loadTokens()

/***
 * Proxy requests
 */

app.get(['/api/msal'], (_req: Request, res: Response) => {
    if(Manager._apiClient === undefined){
        res.status(503)
        res.send('Server not ready yet. Please try again later.')
        return
    }

    Manager.getMsalToken().then((result) => {
        res.send(result.data.lpt)

    }).catch((err:unknown) => {
        console.log('error', err)
        res.send(err)
    })
})

app.get(['/v6/{*any}', '/v5/{*any}'], (req: Request, res: Response) => {
    if(Manager._apiClient === undefined){
        res.status(503)
        res.send('Server not ready yet. Please try again later.')
        return
    }

    console.log('[PROXY] GET', req.path)
    let client: ApiClient | undefined
    if(req.path.includes('/cloud/')){
        client = Manager._apiCloudClient
    } else {
        client = Manager._apiClient
    }

    if(client === undefined){
        res.status(503)
        res.send('Server not ready yet. Please try again later.')
        return
    }

    client.get(req.path, {}).then((result) => {
        console.log('[PROXY] OK:', req.path)
        res.send(result)

    }).catch((err:unknown) => {
        console.log('[PROXY] Error:', err)
        res.status(500)
        res.send(err)
    })
})

app.post(['/v5/{*any}'], (req: Request, res: Response) => {
    if(Manager._apiClient === undefined){
        res.status(503)
        res.send('Server not ready yet. Please try again later.')
        return
    }

    console.log('[PROXY] POST', req.path, JSON.stringify(req.body, null, 2))
    let client: ApiClient | undefined
    if(req.path.includes('/cloud/')){
        client = Manager._apiCloudClient
    } else {
        client = Manager._apiClient
    }

    if(client === undefined){
        res.status(503)
        res.send('Server not ready yet. Please try again later.')
        return
    }

    const deviceInfo = req.header('x-ms-device-info')
    client.post(req.path, JSON.stringify(req.body), { ...(deviceInfo !== undefined ? { 'x-ms-device-info': deviceInfo } : {}) }).then((result) => {
        console.log('[PROXY] OK:', req.path)
        res.send(result)

    }).catch((err:unknown) => {
        console.log('[PROXY] Error:', err)
        res.status(500)
        res.send(err)
    })
})