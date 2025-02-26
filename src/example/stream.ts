import xCloudPlayer from '../library'
import xCloudApiClient from '../apiclient'

class StreamApp {

    _apiClient:xCloudApiClient

    _currentStream
    _refreshInterval
    _keepaliveInterval

    _player

    constructor() {
        this._apiClient = new xCloudPlayer.ApiClient({ host: 'http://'+window.location.hostname+':'+window.location.port })
        this._apiClient.getConsoles().then((consoles) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            let consolesHtml = '';
        
            for(const device in consoles.results) {
                // consolesHtml += consoles.results[device].deviceName+' ('+consoles.results[device].consoleType+') - '+consoles.results[device].serverId+' isSameNetwork:'+!consoles.results[device].outOfHomeWarning+' <button style="padding: 20px;">'+consoles.results[device].powerState+'</button> <button style="padding: 20px;" onclick="app.startSession(\'xhome\', \''+consoles.results[device].serverId+'\')">Start session</button> <br />'
                consolesHtml += '<li>'
                consolesHtml += '   '+consoles.results[device].deviceName+'('+consoles.results[device].consoleType+') <br />'
                consolesHtml += '   '+consoles.results[device].serverId+' - '+consoles.results[device].powerState + '<br />'
                consolesHtml += '   <button style="margin: 10px; padding: 5px;" onclick="examplePlayer.app.start(\'home\', \''+consoles.results[device].serverId+'\')">Start session</button>'
                consolesHtml += '</li>'
            }
            consoleDiv.innerHTML = consolesHtml
        
        }).catch((error) => {
            var consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            consoleDiv.innerHTML = JSON.stringify(error)
        })
    }

    loaded(){
        const holder = document.getElementById('xcloudTitle') as any

        holder.value = localStorage.getItem('xcloudTitle')
        document.getElementById('xcloudTitle')?.addEventListener('change', (event) => {
            const titleId = (event.target as any)?.value
            localStorage.setItem('xcloudTitle', titleId)
        })
    }

    start(type, titleId){
        const connectionStatus = document.getElementById('connectionStatus')
        if(connectionStatus === null){
            return
        }

        connectionStatus.innerText = 'Requesting stream: '+type+' - '+titleId

        this._apiClient.startStream(type, titleId).then((stream) => {
            connectionStatus.innerText = 'Stream requested, waiting to be ready: '+type+' - '+titleId
            
            this._currentStream = stream
            this._currentStream.onProvisioned = () => {
                console.log('Stream is provisioned. Lets start the player.')
                this.loadPlayer()
                this._keepaliveInterval = setInterval(() => {
                    this._currentStream.sendKeepalive().then((response) => {
                        if(response.code === 'SessionNotActive' || response.code === 'SessionNotFound'){
                            clearInterval(this._keepaliveInterval)
                            console.log('Removing keepalive as session is not active anymore.')
                        }
                        console.log('Keepalive sent:', response)
                    }).catch((error) => {
                        console.error('Failed to send keepalive:', error)
                    })
                }, 30*1000)
            }
            this._currentStream.onReadyToConnect = () => {
                fetch('/api/msal')
                .then((response) => response.text())
                .then((response) => {
                    this._currentStream.sendMSALAuth(response).then((response) => {
                        console.log('MSAL Auth response:', response)
                    }).catch((error) => {
                        console.error('Failed to send MSAL Auth:', error)
                    })
                }).catch((error) => {
                    console.error('Failed to fetch MSAL token:', error)
                })
                console.log('Console is ready. Lets send over the MSAL token.')
            }

            this._currentStream.waitForState('Provisioned')
        }).catch((error) => {
            console.error('Failed to start stream:', error)
        })

    }

    loadPlayer(){
        const connectionStatus = document.getElementById('connectionStatus')
        if(connectionStatus === null){
            return
        }

        console.log('Console is ready, lets setup the WebRTC client.')
        this._player = new xCloudPlayer.Player('streamHolder')

        this._player.onConnectionStateChange((state) => {
            connectionStatus.innerText = state
        })

        this._player.setChatSdpHandler((offer) => {
            this._currentStream.sendChatSDPOffer(offer).then((sdpResponse) => {
                this._player.setRemoteOffer(JSON.parse(sdpResponse.exchangeResponse).sdp)
            }).catch((error) => {
                console.log('sendChatSDPOffer error:', error)
            })
        })

        this._player.createOffer().then((offer) => {
            this._currentStream.sendSDPOffer(offer).then((sdpResponse) => {
                this._player.setRemoteOffer(JSON.parse(sdpResponse.exchangeResponse).sdp)

                const candidates = this._player.getIceCandidates()
                const iceCandidates = candidates.map((candidate) => {
                    return JSON.stringify({ candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex, usernameFragment: candidate.usernameFragment })
                })
                
                this._currentStream.sendIceCandidates(iceCandidates).then((iceResponse) => {
                    const iceRemote = JSON.parse(iceResponse.exchangeResponse)
                    this._player.setRemoteIceCandidates(iceRemote)

                }).catch((error) => {
                    console.error('Failed to send ice candidates:', error)
                })


            }).catch((error) => {
                console.error('Failed to send offer:', error)
            })

        }).catch((error) => {
            console.error('Failed to create offer:', error)
        })

        console.log(this._player)
    }

    destroyPlayer(){
        if(this._player !== undefined){
            this._player.destroy()
            clearInterval(this._refreshInterval)
            clearInterval(this._keepaliveInterval)
            delete this._player
        } else {
            console.log('Player is already destroyed!')
        
        }
    }
}

class VirtualGamepad {

    _isAttached = false
    _gamepad

    attach(index = 0) {
        console.log('[VirtualGamepad] Attaching virtual gamepad on index:', index)
        this._gamepad = new xCloudPlayer.Gamepad(index, { enable_keyboard: true})

        if(app._player){
            this._gamepad.attach(app._player)
            this._isAttached = true
        } else {
            console.log('[VirtualGamepad] Failed to attach gamepad to Player istance:', app._player)
            return
        }
    }

    detach() {
        if(this._isAttached === false){
            console.log('[VirtualGamepad] Virtual Gamepad is not attached')
            return
        }
        this._gamepad.detach()
        this._isAttached = false
    }

    sendGamepadButtonPress(button) {
        this._gamepad.sendButtonState(button, 1)
        setTimeout(() => {
            this._gamepad.sendButtonState(button, 0)
        }, 50)
    }

    sendGamepadButtonState(button, value) {
        this._gamepad.sendButtonState(button, value)
    }
}

class VirtualMKB {
    _isAttached = false
    _mkb

    attach(index = 0) {
        console.log('[VirtualMKB] Attaching MKB on index:', index)
        this._mkb = new xCloudPlayer.MouseKeyboard(index)

        if(app._player){
            this._mkb.attach(app._player)
            this._isAttached = true
        } else {
            console.log('[VirtualMKB] Failed to attach MKB to Player istance:', app._player)
            return
        }
    }

    detach() {
        if(this._isAttached === false){
            console.log('[VirtualMKB] Virtual MKB is not attached')
            return
        }
        this._mkb.detach()
        this._isAttached = false
    }
}

class VirtualTouch {
    _isAttached = false
    _touch

    attach(index = 0) {
        console.log('[VirtualTouch] Attaching Touch on index:', index)
        this._touch = new xCloudPlayer.Touch(index)

        if(app._player){
            this._touch.attach(app._player)
            this._isAttached = true
        } else {
            console.log('[VirtualTouch] Failed to attach Touch to Player istance:', app._player)
            return
        }
    }

    detach() {
        if(this._isAttached === false){
            console.log('[VirtualTouch] Virtual Touch is not attached')
            return
        }
        this._touch.detach()
        this._isAttached = false
    }
}

const vGamepad1 = new VirtualGamepad()
const vGamepad2 = new VirtualGamepad()
const vMkb = new VirtualMKB()
const vTouch = new VirtualTouch()

const app = new StreamApp()

window.addEventListener('load', (event) => {
    console.log('loaded!')
    app.loaded()
})

export {
    app,
    vGamepad1,
    vGamepad2,
    vMkb,
    vTouch
}