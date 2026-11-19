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

            consoleDiv.replaceChildren()
            for(const device of consoles.results) {
                const li = document.createElement('li')
                li.appendChild(document.createTextNode(`${device.deviceName}(${device.consoleType})`))
                li.appendChild(document.createElement('br'))
                li.appendChild(document.createTextNode(`${device.serverId} - ${device.powerState}`))
                li.appendChild(document.createElement('br'))

                const button = document.createElement('button')
                button.style.margin = '10px'
                button.style.padding = '5px'
                button.textContent = 'Start session'
                button.addEventListener('click', () => {
                    this.start('home', device.serverId)
                })
                li.appendChild(button)

                consoleDiv.appendChild(li)
            }
        
        }).catch((error) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            consoleDiv.textContent = JSON.stringify(error)
        })
    }

    loaded(){
        const holder = document.getElementById('xcloudTitle') as HTMLInputElement | null
        if(holder !== null){
            holder.value = localStorage.getItem('xcloudTitle') || ''
            holder.addEventListener('change', (event) => {
                const titleId = (event.target as HTMLInputElement)?.value || ''
                localStorage.setItem('xcloudTitle', titleId)
            })
        }
    }

    start(type:'home'|'cloud', titleId:string):void{
        const connectionStatus = document.getElementById('connectionStatus')
        if(connectionStatus === null){
            return
        }

        if(this._player !== undefined || this._currentStream !== undefined){
            this.destroyPlayer()
        } else {
            clearInterval(this._refreshInterval)
            clearInterval(this._keepaliveInterval)
            this._refreshInterval = undefined
            this._keepaliveInterval = undefined
        }

        connectionStatus.innerText = 'Requesting stream: '+type+' - '+titleId

        this._apiClient.startStream(type, titleId).then((stream) => {
            connectionStatus.innerText = 'Stream requested, waiting to be ready: '+type+' - '+titleId
            
            this._currentStream = stream
            const currentStream = stream
            currentStream.onProvisioned = () => {
                if(this._currentStream !== currentStream){
                    return currentStream
                }
                console.log('Stream is provisioned. Lets start the player.')
                this.loadPlayer()
                clearInterval(this._keepaliveInterval)
                this._keepaliveInterval = setInterval(() => {
                    currentStream.sendKeepalive().then((response:unknown) => {
                        const resp = response as { code?: string } | undefined
                        if(resp?.code === 'SessionNotActive' || resp?.code === 'SessionNotFound'){
                            clearInterval(this._keepaliveInterval)
                            this._keepaliveInterval = undefined
                            console.log('Removing keepalive as session is not active anymore.')
                        }
                        console.log('Keepalive sent:', response)
                    }).catch((error:unknown) => {
                        const errObj = error as { status?: number; code?: string; error?: { code?: string } } | undefined
                        const code = errObj?.error?.code ?? errObj?.code
                        const status = errObj?.status
                        if(code === 'SessionNotActive' || code === 'SessionNotFound' || status === 404 || status === 410){
                            clearInterval(this._keepaliveInterval)
                            this._keepaliveInterval = undefined
                            console.log('Removing keepalive as session is not active anymore.')
                            return
                        }
                        console.error('Failed to send keepalive:', error)
                    })
                }, 30*1000)
                return currentStream
            }
            currentStream.onReadyToConnect = () => {
                if(this._currentStream !== currentStream){
                    return currentStream
                }
                fetch('/api/msal')
                    .then((response) => response.text())
                    .then((response) => {
                        currentStream.sendMSALAuth(response).then((authResponse) => {
                            console.log('MSAL Auth response:', authResponse)
                        }).catch((error:unknown) => {
                            console.error('Failed to send MSAL Auth:', error)
                        })
                    }).catch((error:unknown) => {
                        console.error('Failed to fetch MSAL token:', error)
                    })
                console.log('Console is ready. Lets send over the MSAL token.')
                return currentStream
            }

            currentStream.waitForState('Provisioned')
        }).catch((error:unknown) => {
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

    destroyPlayer():void{
        clearInterval(this._refreshInterval)
        clearInterval(this._keepaliveInterval)
        this._refreshInterval = undefined
        this._keepaliveInterval = undefined

        const prevStream = this._currentStream
        this._currentStream = undefined
        if(prevStream !== undefined){
            prevStream.stop().catch(() => {
                // Ignore stop errors during teardown
            })
        }

        if(this._player !== undefined){
            this._player.destroy()
            this._player = undefined
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

window.addEventListener('load', () => {
    console.log('loaded!')
    app.loaded()
})

export {
    app,
    vGamepad1,
    vGamepad2,
    vMkb,
    vTouch,
}