import xCloudPlayer from '../library'
import xCloudApiClient from '../apiclient'

class StreamApp {

    _apiClient:xCloudApiClient

    _currentStream
    _refreshInterval
    _keepaliveInterval

    _player

    _volume = 1
    // Stores the last audible volume (0..1) to restore when unmuting from 0%
    _lastNonZeroVolume = 1
    _muted = false

    constructor() {
        this._apiClient = new xCloudPlayer.ApiClient({ host: 'http://'+window.location.hostname+':'+window.location.port })
        this._apiClient.getConsoles().then((consoles) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            let consolesHtml = ''
        
            for(const device in consoles.results) {
                consolesHtml += '<li>'
                consolesHtml += '   '+consoles.results[device].deviceName+'('+consoles.results[device].consoleType+') <br />'
                consolesHtml += '   '+consoles.results[device].serverId+' - '+consoles.results[device].powerState + '<br />'
                consolesHtml += '   <button style="margin: 10px; padding: 5px;" onclick="examplePlayer.app.start(\'home\', \''+consoles.results[device].serverId+'\')">Start session</button>'
                consolesHtml += '</li>'
            }
            consoleDiv.innerHTML = consolesHtml
        
        }).catch((error) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            consoleDiv.innerHTML = JSON.stringify(error)
        })
    }

    loaded(){
        const holder = document.getElementById('xcloudTitle') as HTMLInputElement | null

        if(holder !== null){
            holder.value = localStorage.getItem('xcloudTitle') || ''
            holder.addEventListener('change', (event) => {
                const titleId = (event.target as HTMLInputElement)?.value
                localStorage.setItem('xcloudTitle', titleId)
            })
        }

        const savedVolume = localStorage.getItem('xcloudVolume')
        if(savedVolume !== null){
            const parsedVolume = parseFloat(savedVolume)
            if(!Number.isNaN(parsedVolume)){
                this._volume = Math.min(1, Math.max(0, parsedVolume))
                if(this._volume > 0){
                    this._lastNonZeroVolume = this._volume
                }
            }
        }

        if(localStorage.getItem('xcloudMuted') === 'true'){
            this._muted = true
        }

        this.updateVolumeUI()

        document.getElementById('volumeSlider')?.addEventListener('input', (event) => {
            this.setVolume(Number((event.target as HTMLInputElement).value))
        })

        document.getElementById('muteButton')?.addEventListener('click', () => {
            this.toggleMute()
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
        this._player = new xCloudPlayer.Player('streamHolder', {
            audio_volume: this._volume,
            audio_muted: this._muted,
        })

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

    setVolume(volumePercent:number){
        if(typeof volumePercent !== 'number' || Number.isNaN(volumePercent)){
            return
        }

        const clampedPercent = Math.min(100, Math.max(0, volumePercent))
        this._volume = clampedPercent / 100
        localStorage.setItem('xcloudVolume', this._volume.toString())

        if(clampedPercent > 0){
            this._lastNonZeroVolume = this._volume
            if(this._muted){
                this._muted = false
                localStorage.setItem('xcloudMuted', 'false')
                this._player?.setMuted(false)
            }
        }

        if(this._player !== undefined){
            this._player.setVolume(this._volume)
        }

        this.updateVolumeUI()
    }

    toggleMute(){
        this._muted = !this._muted
        localStorage.setItem('xcloudMuted', this._muted ? 'true' : 'false')

        if(!this._muted && this._volume === 0){
            this._volume = this._lastNonZeroVolume > 0 ? this._lastNonZeroVolume : 1
            localStorage.setItem('xcloudVolume', this._volume.toString())
            this._player?.setVolume(this._volume)
        }

        if(this._player !== undefined){
            this._player.setMuted(this._muted)
        }

        this.updateVolumeUI()
    }

    updateVolumeUI(){
        const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement | null
        const volumeValue = document.getElementById('volumeValue')
        const muteButton = document.getElementById('muteButton')
        const volumePercent = Math.round(this._volume * 100)

        if(volumeSlider !== null){
            volumeSlider.value = volumePercent.toString()
        }

        if(volumeValue !== null){
            volumeValue.innerText = this._muted ? 'Muted' : volumePercent+'%'
        }

        if(muteButton !== null){
            muteButton.innerText = this._muted ? 'Unmute' : 'Mute'
            muteButton.setAttribute('aria-pressed', this._muted ? 'true' : 'false')
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