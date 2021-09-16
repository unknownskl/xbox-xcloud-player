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
                                                ice: {
                                                    candidate: client.getIceCandidates()[0].candidate,
                                                    sdpMLineIndex: client.getIceCandidates()[0].sdpMLineIndex,
                                                    sdpMid: client.getIceCandidates()[0].sdpMid,
                                                }
                                            })
                                        })

                                        // ICE Has been set, lets do ICE
                                        this.isExchangeReady('/api/config/ice').then((data) => {
                                            // Got ICE Data. Lets add the candidates to webrtc client

                                            var iceDetails = JSON.parse(data.candidates)
                                            console.log('xCloudPlayer Client - ICE Candidates:', iceDetails)
                                            client.setIceCandidates(iceDetails)

                                            // Listen for connection change
                                            client.getEventBus().on('connectionstate', (event) => {
                                                console.log(':: Connection state updated:', event)
                                                const element = document.getElementById('streamStatus')
                                                element.innerHTML = event.state

                                                if(event.state === 'connected'){
                                                    // We are connected
                                                    console.log(':: We are connected!')

                                                    this.setupUI()

                                                } else if(event.state === 'closing'){
                                                    // Connection is closing
                                                    console.log(':: We are going to disconnect!')

                                                } else if(event.state === 'closed'){
                                                    // Connection has been closed. We have to cleanup here
                                                    console.log(':: We are disconnected!')
                                                }
                                            })
                                            


                                            
                                        }).catch((error) => {
                                            console.log('xCloudPlayer Client - ICE Exchange error:', error) // Change for throw?
                                        })
                                    
                                    }).catch((error) => {
                                        console.log('xCloudPlayer Client - SDP Response Offer failed:', error)
                                    })
                                }).catch((error) => {
                                    console.log('xCloudPlayer Client - Configuration failed:', error)
                                })

                            })

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
    },

    //
    // Setup UI
    //
    setupUI() {
        client.getEventBus().on('fps_audio', (event) => {
            const element = document.getElementById('fpsCounter_audio')
            element.innerHTML = event.fps
        })
        client.getEventBus().on('fps_video', (event) => {
            const element = document.getElementById('fpsCounter_video')
            element.innerHTML = event.fps
        })

        client.getEventBus().on('fps_metadata', (event) => {
            const element = document.getElementById('fpsCounter_metadata')
            element.innerHTML = event.fps
        })
        client.getEventBus().on('fps_input', (event) => {
            const element = document.getElementById('fpsCounter_input')
            element.innerHTML = event.fps
        })

        this.setupModal()
        this.setupDisconnect()
    },

    setupDisconnect() {
        client.getEventBus().on('message', (event) => {
            console.log('ModalHelper event', event)

            if(event.target === '/streaming/sessionLifetimeManagement/serverInitiatedDisconnect') {
                // Received disconnect message
                const message = JSON.parse(event.content)
                alert('Disconnected. Reason: ' + message.reason)
            }
        })
    },

    setupModal() {
        client.getEventBus().on('message', (event) => {
            if(event.target === '/streaming/systemUi/messages/ShowMessageDialog') {
                // Show Modal Dialog
                const id = event.id
                const type = event.type
                const modalContent = JSON.parse(event.content)
                console.log('Show Modal:', modalContent)

                document.getElementById('dialogTitle').innerHTML = modalContent.TitleText
                document.getElementById('dialogText').innerHTML = modalContent.ContentText

                if(modalContent.CommandLabel1 !== ''){
                    const button1 = document.getElementById('dialogButton1')
                    button1.innerHTML = modalContent.CommandLabel1
                    button1.onclick = () => {
                        client.getChannelProcessor('message').sendTransaction(id, JSON.stringify({ Result: 0 }))
                        this.resetModal()
                    }
                }
                if(modalContent.CommandLabel2 !== ''){
                    const button2 = document.getElementById('dialogButton2')
                    button2.innerHTML = modalContent.CommandLabel2
                    button2.onclick = () => {
                        client.getChannelProcessor('message').sendTransaction(id, JSON.stringify({ Result: 1 }))
                        this.resetModal()
                    }
                }
                if(modalContent.CommandLabel3 !== ''){
                    const button3 = document.getElementById('dialogButton3')
                    button3.innerHTML = modalContent.CommandLabel3
                    button3.onclick = () => {
                        client.getChannelProcessor('message').sendTransaction(id, JSON.stringify({ Result: 2 }))
                        this.resetModal()
                    }
                }
            } else if(event.type === 'SenderCancel') {
                // Cancel transaction and reset Modal
                this.resetModal()
            }
        })
    },

    resetModal() {
        document.getElementById('dialogTitle').innerHTML = 'No active dialog'
        document.getElementById('dialogText').innerHTML = ''

        const button1 = document.getElementById('dialogButton1')
        button1.innerHTML = ''
        button1.onclick = undefined

        const button2 = document.getElementById('dialogButton2')
        button1.innerHTML = ''
        button2.onclick = undefined

        const button3 = document.getElementById('dialogButton3')
        button1.innerHTML = ''
        button3.onclick = undefined
    }
}

window.addEventListener('load', (event) => {
    // console.log(xCloudPlayer)
    client = new xCloudPlayer.default('videoHolder', {
        ui_systemui: [10,19,31,27,32,33]
    })

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