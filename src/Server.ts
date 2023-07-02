// const express = require('express')
import express from 'express'
import * as https from 'https'
import bodyParser from 'body-parser'


const app = express()
const port = 3000

let tempSessionID = ''
const userToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjBGMjQ4N0RELTlCNzEtNDY0NC05QTg0LUYwRTMwMTdCMTA3MiIsInR5cCI6IkpXVCJ9.eyJhcHBpZCI6IjEwMTY4OTg0MzkiLCJjb3VudHJ5IjoiMTAzIiwiY291bnRyeWNvZGUiOiJVUyIsImRldmljZWlkIjoiRjcwMEZDQUNGRjkwM0U1NSIsImRldmljZXR5cGUiOiJBbmRyb2lkIiwidXNlcmlkIjoibXJiaXJkbWFueiIsInB1aWQiOiI5ODUxNTYxMzEzMTIyMTAiLCJ4dWlkIjoiMjUzMzI3NDk4MDY3ODQ3NyIsInh1c0ZsaWdodHMiOiJbXCI0NjExNjg2MDE4NDQxNDYzMDAwXCIsXCI0NjExNjg2MDE4NTQ3MzMyMDAwXCIsXCI0NjExNjg2MDE4OTA3MjUwMDAwXCIsXCJiNGVjMjU0ZS1jZWMwLTQ5ZGQtODMxMy1lZjVkMDVmYmFlZjVcIixcImMxNjM3MzJhLWRlYjYtNDE0MC1iOWM1LTdjZmQzZDBhYjg3MVwiLFwiMWMzZjc4YWItOWFiYS00ZDVjLTgzNzAtODZhNWU3ODlhOTdjXCJdIiwicGFydG5lcmlkIjoiTUlDUk9TT0ZUIiwib2ZmZXJpbmdpZCI6IlhIT01FIiwiaW5zdGFuY2VpZCI6IjY4OGFmODJiLTc4YjQtNGI0NC05ZmFmLTM4NDU3MjAwMjlmZCIsInR5cGUiOiJVc2VyIiwidmVyc2lvbiI6IjIuMCIsImZsaWdodHMiOiJ7fSIsIm5iZiI6MTY4ODMyMTcyNSwiZXhwIjoxNjg4MzM2MTI1LCJpYXQiOjE2ODgzMjE3MjUsImlzcyI6Imh0dHBzOi8veGhvbWUtYXV0aC1wcm9kLnhib3hsaXZlLmNvbSIsImF1ZCI6Imh0dHBzOi8veGhvbWUtcHJvZC54Ym94bGl2ZS5jb20ifQ.ouMXEyVwyuyD3zkVkuOvB3MID9CFgzGrD4lnZvAt8jSqgT38qYAxok4yCuTS27NzdB_i6JswitZPFxaJDrPVRAtg_lJEMpTz72geaW_aG_h9vVfjSItVbpBhr9y41DPatTwzgOrZq-gbMTdeAQUqt_d-lexVYF4jUpBNvMr5EJ8'
app.use(bodyParser.json())

app.use(express.static('www'))
app.use('/dist', express.static('dist/assets'))
// app.use('/opus', express.static('src/Opus'))

app.listen(port, () => {
    console.log(`Streaming App listening at http://localhost:${port}`)
})

app.get('/', (req, res) => {
    res.send('Server running... <a href="stream.html">Open streaming interface</a>')
})

app.get('/api/consoles', (req, res) => {
    // res.send('ok'); return
    https.get({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v6/servers/home',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) =>{

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            if(response.statusCode === 200){
                const responseData = JSON.parse(data)
                res.send(responseData)
            } else {
                console.log('Error fetching consoles. Status:', response.statusCode, 'Body:', data)
                res.status(response.statusCode as number).send(data)
            }
        })  
    })
})

app.get('/api/start/:serverId', (req, res) => {
    const postRequest = https.request({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/play',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            console.log('API - start statuscode:', response.statusCode)
            const responseData = JSON.parse(data)
            tempSessionID = responseData.sessionId // Set session id
            console.log('API - start set sessionID:', tempSessionID)
            res.send(responseData)
        })
    })

    postRequest.write(JSON.stringify({
        titleId: '',
        systemUpdateGroup: '',
        settings: {
            nanoVersion: 'V3;WebrtcTransport.dll',
            enableTextToSpeech: false,
            highContrast: 0,
            locale: 'en-US',
            useIceConnection: false,
            timezoneOffsetMinutes: 120,
            sdkType: 'web',
            osName: 'windows',
        },
        serverId: req.params.serverId,
        fallbackRegionNames: [],
    }))
    postRequest.end()
})

app.get('/api/session', (req, res) => {
    console.log('API - session sessionID:', tempSessionID)

    https.get({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/state',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            console.log('API - session statuscode:', response.statusCode)
            const responseData = JSON.parse(data)
            res.send(responseData)
        })
    })
})

app.get('/api/config', (req, res) => {
    console.log('API - config sessionID:', tempSessionID)

    https.get({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/configuration',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            console.log('API - config statuscode:', response.statusCode)
            const responseData = JSON.parse(data)
            res.send(responseData)
        })
    })
})

app.get('/api/session/:id', (req, res) => {
    tempSessionID = req.params.id
    console.log('API  - setsession Set session to:', tempSessionID)
    res.send('ok')
})

app.post('/api/config/sdp', (req, res) => {
    console.log('API - POST - config-sdp sessionID:', tempSessionID)
    console.log(req.body.sdp)

    const postRequest = https.request({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/sdp',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {
        
        response.on('end', () => {
            console.log('API - start statuscode:', response.statusCode)
            if(response.statusCode === 202){
                res.send('ok')
            } else {
                res.send('failed')
            }
        })
    })

    postRequest.write(JSON.stringify({
        'messageType':'offer',
        'requestId': 1,
        'sdp': req.body.sdp,
        'configuration':{
            'containerizeAudio':false,
            'chatConfiguration':{
                'bytesPerSample':2,
                'expectedClipDurationMs':20,
                'format':{
                    'codec':'opus',
                    'container':'webm',
                },
                'numChannels':1,
                'sampleFrequencyHz':24000,
            },
            'chat':{
                'minVersion':1,
                'maxVersion':1,
            },
            'control':{
                'minVersion':1,
                'maxVersion':3,
            },
            'input':{
                'minVersion':1,
                'maxVersion':7,
            },
            'message':{
                'minVersion':1,
                'maxVersion':1,
            },
        },
    }))
    postRequest.end()
})

app.post('/api/config/ice', (req, res) => {
    console.log('API - POST - config-ice sessionID:', tempSessionID)
    console.log(req.body.ice)

    const postRequest = https.request({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/ice',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        response.on('end', () => {
            console.log('API - start statuscode:', response.statusCode)
            if(response.statusCode === 202){
                res.send('ok')
            } else {
                res.send('failed')
            }
        })
    })

    postRequest.write(JSON.stringify({
        'messageType': 'iceCandidate',
        'candidate': req.body.ice,
        'connectionId': -1,
        'requestId': 1,
    }))

    postRequest.end()
})

app.get('/api/config/sdp', (req, res) => {
    console.log('API - config-sdp sessionID:', tempSessionID)

    https.get({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/sdp',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            console.log('API - config-sdp statuscode:', response.statusCode)
            if(response.statusCode === 200){
                const responseData = JSON.parse(data)
                res.send(responseData)
            } else {
                res.status(response.statusCode as number).send('')
            }
        })
    })
})

app.get('/api/config/ice', (req, res) => {
    console.log('API - config-ice sessionID:', tempSessionID)

    https.get({
        host: 'uks.gssv-play-prodxhome.xboxlive.com',
        path: '/v5/sessions/home/'+ tempSessionID +'/ice',
        headers: {
            'Authorization': 'Bearer '+userToken,
            'Content-Type': 'application/json; charset=utf-8',
        },
    }, (response) => {

        let data = ''
        response.on('data', chunk => {
            data += chunk
        })
        response.on('end', () => {
            console.log('API - config-ice statuscode:', response.statusCode)
            if(response.statusCode === 200){
                const responseData = JSON.parse(data)
                res.send(responseData)
            } else {
                res.status(response.statusCode as number).send('')
            }
        })
    })
})