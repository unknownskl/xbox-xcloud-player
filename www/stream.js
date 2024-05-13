class StreamApp {

    _currentStream
    _refreshInterval

    _player

    constructor() {
        this._apiClient = new xCloudPlayer.default.ApiClient({ host: 'http://'+window.location.hostname+':'+window.location.port })
        this._apiClient.getConsoles().then((consoles) => {
            var consoleDiv = document.getElementById('consolesList')
            var consolesHtml = '';
        
            for(var device in consoles.results) {
                // consolesHtml += consoles.results[device].deviceName+' ('+consoles.results[device].consoleType+') - '+consoles.results[device].serverId+' isSameNetwork:'+!consoles.results[device].outOfHomeWarning+' <button style="padding: 20px;">'+consoles.results[device].powerState+'</button> <button style="padding: 20px;" onclick="app.startSession(\'xhome\', \''+consoles.results[device].serverId+'\')">Start session</button> <br />'
                consolesHtml += '<li>'
                consolesHtml += '   '+consoles.results[device].deviceName+'('+consoles.results[device].consoleType+') <br />'
                consolesHtml += '   '+consoles.results[device].serverId+' - '+consoles.results[device].powerState + '<br />'
                consolesHtml += '   <button style="margin: 10px; padding: 5px;" onclick="app.start(\'home\', \''+consoles.results[device].serverId+'\')">Start session</button>'
                consolesHtml += '</li>'
            }
            consoleDiv.innerHTML = consolesHtml
        
        }).catch((error) => {
            var consoleDiv = document.getElementById('consolesList')
            consoleDiv.innerHTML = JSON.stringify(error)
        })
    }

    start(type, titleId){
        document.getElementById('connectionStatus').innerText = 'Requesting stream: '+type+' - '+titleId
        // console.log('Start stream:', type, titleId)
        this._apiClient.startStream('home', titleId).then((stream) => {
            document.getElementById('connectionStatus').innerText = 'Stream requested, waiting to be ready: '+type+' - '+titleId
            // console.log('Stream started:', stream)
            this._currentStream = stream

            this._currentStream.onProvisioned = () => {
                console.log('Stream is provisioned. Lets start the player.')
                this.loadPlayer()
            }

            this._currentStream.waitForState('Provisioned')
        }).catch((error) => {
            console.error('Failed to start stream:', error)
        })

    }

    loadPlayer(){
        console.log('Console is ready, lets setup the WebRTC client.')
        this._player = new xCloudPlayer.default.Player('streamHolder')

        this._player.onConnectionStateChange((state) => {
            document.getElementById('connectionStatus').innerText = state
        })

        this._player.setChatSdpHandler((offer) => {
            this._currentStream.sendChatSDPOffer(offer).then((sdpResponse) => {
                this._player.setRemoteOffer(JSON.parse(sdpResponse.exchangeResponse).sdp)
            }).catch((error) => {
                reject(error)
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
            delete this._player
        } else {
            console.log('Player is already destroyed!')
        
        }
    }
}

class VirtualGamepad {

    _isAttached = false

    attach(index = 0) {
        console.log('[VirtualGamepad] Attaching virtual gamepad on index:', index)
        this._gamepad = new xCloudPlayer.default.Gamepad(index, { enable_keyboard: true})

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
        this._gamepad.sendButtonState(button, 0)
    }

    sendGamepadButtonState(button, value) {
        this._gamepad.sendButtonState(button, value)
    }
}

class VirtualMKB {
    attach(index = 0) {
        console.log('[VirtualMKB] Attaching MKB on index:', index)
        this._mkb = new xCloudPlayer.default.MouseKeyboard(index)

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
    attach(index = 0) {
        console.log('[VirtualTouch] Attaching Touch on index:', index)
        this._touch = new xCloudPlayer.default.Touch(index)

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
    
})