import Channel from '../lib/channel'

export default class ChatChannel extends Channel {

    _micPermissions:'granted'|'denied'|'prompt' = 'prompt'
    _micStream:MediaStream | undefined
    private _permissionStatus:PermissionStatus | undefined
    private _isDestroyed = false

    constructor(player:any){
        super(player)

        if(typeof navigator !== 'undefined' && navigator.permissions?.query){
            Promise.resolve(navigator.permissions.query({ name: 'microphone' })).then((permissionStatus) => {
                if(this._isDestroyed){
                    return
                }
                this._permissionStatus = permissionStatus
                this._micPermissions = permissionStatus.state

                permissionStatus.onchange = () => {
                    this._micPermissions = permissionStatus.state
                }
            }).catch(() => {
                // Ignore unsupported microphone permission queries
            })
        }
    }

    getChannelName() {
        return 'chat'
    }

    getChannelConfig() {
        return {
            ordered: true,
            protocol: 'chatV1',
        }
    }

    startMicrophone():void {
        if(this._isDestroyed){
            return
        }
        if(this._micPermissions === 'denied'){
            alert('Microphone permissions are denied. Please enable them in your browser settings.')
            return
        }
        if(this._micStream !== undefined){
            console.log('Microphone already started. You need to stop it first by calling stopMicrophone()')
            return
        }

        navigator.mediaDevices.getUserMedia({ audio: {
            channelCount: 1,
            sampleRate: 24e3,
        } }).then((stream) => {
            if(this._isDestroyed || this._micStream !== undefined){
                stream.getTracks().forEach((track) => track.stop())
                return
            }

            const audioTrack = stream.getAudioTracks()[0]
            if(audioTrack === undefined){
                stream.getTracks().forEach((track) => track.stop())
                return
            }

            this._micStream = stream

            // Add to SDP
            this.getPlayer()._peerConnection.addTrack(audioTrack, stream)
            this.getPlayer().createOffer().then((offer) => {
                if(this._isDestroyed){
                    return
                }
                const sdpHandler = this.getPlayer()._sdpHandler
                if(sdpHandler !== undefined){
                    sdpHandler(offer)
                } else {
                    console.log('No SDP handler set. Set an SDP Handler via player.setChatSdpHandler()')
                }
            }).catch((err:unknown) => {
                console.error('Failed to create chat offer:', err)
            })
        }).catch((err:unknown) => {
            if(!this._isDestroyed){
                alert(`Error connecting to microphone: ${err}`)
            }
        })
    }

    stopMicrophone():void {
        if(this._micStream === undefined) {return}

        this._micStream.getTracks().forEach((track) => {
            track.stop()
        })

        this.getPlayer()._peerConnection.getSenders().forEach((sender) => {
            if(sender.track && sender.track.kind === 'audio'){
                this.getPlayer()._peerConnection.removeTrack(sender)
            }
        })

        this._micStream = undefined
    }

    destroy():void {
        this._isDestroyed = true
        this.stopMicrophone()
        if(this._permissionStatus !== undefined){
            this._permissionStatus.onchange = null
            this._permissionStatus = undefined
        }
        super.destroy()
    }
}