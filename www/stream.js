console.log('Starting xCloudPlayer...')

var client;

var app = {
    activeSessionId: -1,

    getConsoles: function() {
        return new Promise(function(resolve, reject) {
            fetch('/api/consoles').then(response => {
                if(response.status !== 200){
                    reject({ error: 'xCloudPlayer Client - /api/consoles statuscode is not 200' })
                } else {
                    response.json().then(data => {
                        resolve(data.results)
                    }).catch((error) => {
                        reject({ error: error })
                    })
                }
            })
        })
    },

    startSession(type, serverId) {
        console.log('Start session:', type, serverId)
        // this.emitEvent('connect', { type: type, serverId: serverId })

        return new Promise((resolve, reject) => {

            if(type === 'xhome') {
                fetch('/api/start/'+serverId).then(response => {
                    response.json().then(data => {
                        console.log('xCloudPlayer Client - /api/start - ok, got:', data)
                        this.activeSessionId = data.sessionId

                        this.isSessionsReady().then((data) => {
                            console.log('xCloudPlayer Client - /api/start - Session is ready!', data)

                            // Fetch SDP Offer
                            client.createOffer().then((offer) => {

                                console.log('xCloudPlayer Client - Got offer data:', offer)

                                fetch('/api/config/sdp', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        sdp: offer.sdp
                                    })
                                })

                                this.isExchangeReady('/api/config').then((data) => {
                                    this.isExchangeReady('/api/config/sdp').then((data) => {

                                        console.log('xCloudPlayer Client - SDP Server response:', data)

                                        // Do ICE Handshake
                                        var sdpDetails = JSON.parse(data.exchangeResponse)
                                        client.setRemoteOffer(sdpDetails.sdp)

                                        // Send ice config
                                        fetch('/api/config/ice', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                // ice: client.getIceCandidates()[0]
                                                ice: {
                                                    candidate: client.getIceCandidates()[0].candidate,
                                                    sdpMLineIndex: client.getIceCandidates()[0].sdpMLineIndex,
                                                    sdpMid: client.getIceCandidates()[0].sdpMid,
                                                }
                                                // ice: {
                                                //     candidate: 'candidate:415190215 1 udp 2122262783 2a02:a210:2a03:dd80:b437:56f3:b2ef:e71 60938 typ host generation 0 ufrag C0sB network-id 2 network-cost 10',
                                                //     sdpMLineIndex: 0,
                                                //     sdpMid: '0',
                                                // }
                                            })
                                        })

                                        // ICE Has been set, lets do ICE
                                        this.isExchangeReady('/api/config/ice').then((data) => {
                                            // Got ICE Data. Lets add the candidates to webrtc client

                                            var iceDetails = JSON.parse(data.candidates)
                                            console.log('xCloudPlayer Client - ICE Candidates:', iceDetails)
                                            client.setIceCandidates(iceDetails)

                                            // Listen for connection
                                            client.addEventListener('connectionstate', (event) => {
                                                // console.log(':: Connection state updated:', event)

                                                if(event.state === 'connected'){
                                                    // We are connected

                                                } else if(event.state === 'closing'){
                                                    // Connection is closing

                                                } else if(event.state === 'closed'){
                                                    // Connection has been closed. We have to cleanup here
                                                }
                                            })
                                            


                                            
                                        }).catch((error) => {
                                            console.log('xCloudPlayer Client - ICE Exchange error:', error) // Change for throw?
                                        })
                                    
                                    }).catch((error) => {
                                        console.log('xCloudPlayer Client - SDP Response Offer failed:', error)
                                    })
                                })

                            })

                            // this.startWebrtcConnection()
                        }).catch((error)  => {
                            throw error;
                            // console.log('/api/start - Could not start session. Error:', error)
                        })
                    })
                })
            } else {
                reject({ error: 'Only xhome is supported as type to start a new session' })
            }
        })
    },

    isSessionsReady() {
        return new Promise((resolve, reject) => {

            fetch('/api/session').then(response => {
                response.json().then(data => {
                    if(data.state === 'Provisioned'){
                        resolve(data)
                    } else if(data.state === 'Failed'){
                        reject({ error: 'Cannot provision stream. Reason: '+data.errorDetails.code+': '+data.errorDetails.message })
                    } else {
                        console.log('xCloudPlayer Client - /api/session - state is:', data.state, 'Waiting...');

                        setTimeout(() => {
                            this.isSessionsReady().then((data ) => {
                                resolve(data)
                            }).catch((error)  => {
                                reject(error)
                            })
                        }, 1000)
                    }
                })
            })
        })
    },

    isExchangeReady(url) {
        return new Promise((resolve, reject) => {

            fetch(url).then(response => {
                if(response.status !== 200){
                    console.log('xCloudPlayer Client - '+url+' - Waiting...')
                    setTimeout(() => {
                        this.isExchangeReady(url).then((data) => {
                            resolve(data)
                        }).catch((error)  => {
                            reject(error)
                        })
                    }, 1000)
                } else {
                    response.json().then(data => {
                        console.log('xCloudPlayer Client - '+url+' - Ready! Got data:', data)
                        resolve(data)
                    })
                }
            })
        })
    }
}

window.addEventListener('load', (event) => {
    // console.log(xCloudPlayer)
    client = new xCloudPlayer.default('videoHolder')

    // Retrieve consoles
    app.getConsoles().then((consoles) => {
        var consoleDiv = document.getElementById('consolesList')
        var consolesHtml = '';

        for(var device in consoles) {
            consolesHtml += consoles[device].deviceName+' ('+consoles[device].consoleType+') - '+consoles[device].serverId+' isSameNetwork:'+!consoles[device].outOfHomeWarning+' <button>'+consoles[device].powerState+'</button> <button onclick="app.startSession(\'xhome\', \''+consoles[device].serverId+'\')">Start session</button> <br />'
        }
        consoleDiv.innerHTML = consolesHtml

    }).catch((error) => {
        var consoleDiv = document.getElementById('consolesList')
        consoleDiv.innerHTML = JSON.stringify(error)
    })


})