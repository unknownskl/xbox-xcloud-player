import Channel from '../lib/channel'
import xCloudPlayer from '../player'

export default class ChatChannel extends Channel {

    _micPermissions:'granted'|'denied'|'prompt' = 'prompt'
    _micStream:MediaStream | undefined

    constructor(player:xCloudPlayer){
        super(player)

        navigator.permissions.query({ name: 'microphone' as PermissionName }).then((permissionStatus) => {
            this._micPermissions = permissionStatus.state
        
            permissionStatus.onchange = () => {
                this._micPermissions = permissionStatus.state
            }
        })
    }

    getChannelName():string {
        return 'chat'
    }

    getChannelConfig():RTCDataChannelInit {
        return {
            ordered: true,
            protocol: 'chatV1',
        }
    }

    startMicrophone():void {
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
            if(this._micStream !== undefined){
                return
            }

            this._micStream = stream

            // Add to SDP
            this.getPlayer()._peerConnection.addTrack(stream.getAudioTracks()[0], stream)
            this.getPlayer().createOffer().then((offer) => {
                if(this.getPlayer()._sdpHandler){
                    this.getPlayer()._sdpHandler(offer)
                } else {
                    console.log('No SDP handler set. Set an SDP Handler via player.setChatSdpHandler()')
                }
            })
        }).catch((err:unknown) => {
            alert(`Error connecting to microphone: ${err}`)
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
        // console.log('DebugChannel destroy() called')
    }
}