import xCloudPlayer, { StreamType } from '../library'
import xCloudApiClient from '../apiclient'
import xCloudPlayerInstance from '../player'
import Stream from '../lib/stream'
import Gamepad, { GamepadFrameKey } from '../input/gamepad'
import MouseKeyboard from '../input/mousekeyboard'
import Touch from '../input/touch'

class StreamApp {

    _apiClient:xCloudApiClient

    _currentStream: Stream | undefined
    _refreshInterval: ReturnType<typeof setInterval> | undefined
    _keepaliveInterval: ReturnType<typeof setInterval> | undefined

    _player: xCloudPlayerInstance | undefined

    constructor() {
        this._apiClient = new xCloudPlayer.ApiClient({ host: 'http://'+window.location.hostname+':'+window.location.port })
        this._apiClient.getConsoles().then((consoles) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            let consolesHtml = ''
        
            for(const device of consoles.results) {
                consolesHtml += '<li>'
                consolesHtml += '   '+device.deviceName+'('+device.consoleType+') <br />'
                consolesHtml += '   '+device.serverId+' - '+device.powerState + '<br />'
                consolesHtml += '   <button style="margin: 10px; padding: 5px;" onclick="examplePlayer.app.start(\'home\', \''+device.serverId+'\')">Start session</button>'
                consolesHtml += '</li>'
            }
            consoleDiv.innerHTML = consolesHtml
        
        }).catch((error:unknown) => {
            const consoleDiv = document.getElementById('consolesList')
            if(consoleDiv === null){
                return
            }
            consoleDiv.innerHTML = JSON.stringify(error)
        })
    }

    loaded():void{
        const holder = document.getElementById('xcloudTitle') as HTMLInputElement | null

        if(holder !== null){
            holder.value = localStorage.getItem('xcloudTitle') || ''
            holder.addEventListener('change', (event:Event) => {
                const titleId = (event.target as HTMLInputElement | null)?.value || ''
                localStorage.setItem('xcloudTitle', titleId)
            })
        }
    }

    start(type:StreamType, titleId:string):void{
        const connectionStatus = document.getElementById('connectionStatus')
        if(connectionStatus === null){
            return
        }

        connectionStatus.innerText = 'Requesting stream: '+type+' - '+titleId

        this._apiClient.startStream(type, titleId).then((stream) => {
            connectionStatus.innerText = 'Stream requested, waiting to be ready: '+type+' - '+titleId
            
            this._currentStream = stream
            stream.onProvisioned = () => {
                console.log('Stream is provisioned. Lets start the player.')
                this.loadPlayer()
                this._keepaliveInterval = setInterval(() => {
                    stream.sendKeepalive().then((response) => {
                        if(response.code === 'SessionNotActive' || response.code === 'SessionNotFound'){
                            clearInterval(this._keepaliveInterval)
                            console.log('Removing keepalive as session is not active anymore.')
                        }
                        console.log('Keepalive sent:', response)
                    }).catch((error:unknown) => {
                        console.error('Failed to send keepalive:', error)
                    })
                }, 30*1000)
            }
            stream.onReadyToConnect = () => {
                fetch('/api/msal')
                    .then((response) => response.text())
                    .then((response) => {
                        stream.sendMSALAuth(response).then((authResponse) => {
                            console.log('MSAL Auth response:', authResponse)
                        }).catch((error:unknown) => {
                            console.error('Failed to send MSAL Auth:', error)
                        })
                    }).catch((error:unknown) => {
                        console.error('Failed to fetch MSAL token:', error)
                    })
                console.log('Console is ready. Lets send over the MSAL token.')
            }

            stream.waitForState('Provisioned')
        }).catch((error:unknown) => {
            console.error('Failed to start stream:', error)
        })

    }

    loadPlayer():void{
        const connectionStatus = document.getElementById('connectionStatus')
        const currentStream = this._currentStream
        if(connectionStatus === null || currentStream === undefined){
            return
        }

        console.log('Console is ready, lets setup the WebRTC client.')
        const player = new xCloudPlayer.Player('streamHolder')
        this._player = player

        player.onConnectionStateChange((state) => {
            connectionStatus.innerText = state
        })

        player.setChatSdpHandler((offer) => {
            currentStream.sendChatSDPOffer(offer).then((sdpResponse) => {
                const parsed = JSON.parse(sdpResponse.exchangeResponse) as { sdp: string }
                player.setRemoteOffer(parsed.sdp)
            }).catch((error:unknown) => {
                console.log('sendChatSDPOffer error:', error)
            })
        })

        player.createOffer().then((offer) => {
            currentStream.sendSDPOffer(offer).then((sdpResponse) => {
                const parsedSdp = JSON.parse(sdpResponse.exchangeResponse) as { sdp: string }
                player.setRemoteOffer(parsedSdp.sdp)

                const candidates = player.getIceCandidates()
                const iceCandidates = candidates.map((candidate) => {
                    return JSON.stringify({ candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex, usernameFragment: candidate.usernameFragment })
                })
                
                currentStream.sendIceCandidates(iceCandidates).then((iceResponse) => {
                    const iceRemote = JSON.parse(iceResponse.exchangeResponse) as Array<RTCIceCandidateInit>
                    player.setRemoteIceCandidates(iceRemote)

                }).catch((error:unknown) => {
                    console.error('Failed to send ice candidates:', error)
                })


            }).catch((error:unknown) => {
                console.error('Failed to send offer:', error)
            })

        }).catch((error:unknown) => {
            console.error('Failed to create offer:', error)
        })

        console.log(this._player)
    }

    destroyPlayer():void{
        if(this._player !== undefined){
            this._player.destroy()
            clearInterval(this._refreshInterval)
            clearInterval(this._keepaliveInterval)
            this._player = undefined
        } else {
            console.log('Player is already destroyed!')
        
        }
    }
}

class VirtualGamepad {

    _isAttached = false
    _gamepad: Gamepad | undefined

    attach(index:number = 0):void {
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

    detach():void {
        if(this._isAttached === false || this._gamepad === undefined){
            console.log('[VirtualGamepad] Virtual Gamepad is not attached')
            return
        }
        this._gamepad.detach()
        this._isAttached = false
    }

    sendGamepadButtonPress(button:GamepadFrameKey | string):void {
        const gamepad = this._gamepad
        if(gamepad === undefined) {return}

        gamepad.sendButtonState(button, 1)
        setTimeout(() => {
            gamepad.sendButtonState(button, 0)
        }, 50)
    }

    sendGamepadButtonState(button:GamepadFrameKey | string, value:number):void {
        this._gamepad?.sendButtonState(button, value)
    }
}

class VirtualMKB {
    _isAttached = false
    _mkb: MouseKeyboard | undefined

    attach(index:number = 0):void {
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

    detach():void {
        if(this._isAttached === false || this._mkb === undefined){
            console.log('[VirtualMKB] Virtual MKB is not attached')
            return
        }
        this._mkb.detach()
        this._isAttached = false
    }
}

class VirtualTouch {
    _isAttached = false
    _touch: Touch | undefined

    attach(index:number = 0):void {
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

    detach():void {
        if(this._isAttached === false || this._touch === undefined){
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