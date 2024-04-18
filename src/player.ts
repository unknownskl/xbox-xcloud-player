// import DebugChannel from './channel/debug'
import ChatChannel from './channel/chat'
import ControlChannel from './channel/control'
import InputChannel from './channel/input'
import MessageChannel from './channel/message'

import Ice from './lib/ice'
import Sdp from './lib/sdp'
import Teredo from './lib/teredo'

import VideoComponent from './render/video'
import AudioComponent from './render/audio'

export interface xCloudPlayerConfig {

}

export default class xCloudPlayer {
    _peerConnection = new RTCPeerConnection({})
    _channels = {
        chat: new ChatChannel(this),
        control: new ControlChannel(this),
        input: new InputChannel(this),
        message: new MessageChannel(this),
    }

    _config = {}

    private _elementId: string
    private _isDestoyed = false

    private _sdpHelper = new Sdp(this)
    private _iceHelper = new Ice(this)
    private _videoComponent: VideoComponent | undefined
    private _audioComponent: AudioComponent | undefined

    constructor(elementId:string, options:xCloudPlayerConfig = {}) {
        this._elementId = elementId
        this._config = options

        this._peerConnection.addTransceiver('audio', { direction: 'sendrecv' })
        this._peerConnection.addTransceiver('video', { direction: 'recvonly' })

        this._peerConnection.ontrack = (event) => {

            if(event.track.kind === 'video'){
                this._videoComponent = new VideoComponent(this)
                this._videoComponent.create(event.streams[0])
                console.log('Config detected a video stream. Setting up...')

            } else if(event.track.kind === 'audio'){
                this._audioComponent = new AudioComponent(this)
                this._audioComponent.create(event.streams[0])
                console.log('Config detected an audio stream. Setting up...')

            } else {
                console.log('Detected an unknown stream type: ', event.track.kind)
            }
        }
    }

    createOffer() {
        return new Promise((resolve, reject) => {
            // if(this._codecPreference !== ''){
            //     console.log('xCloudPlayer Library.ts - createOffer() Set codec preference mimetype to:', this._codecPreference)
            //     this._setCodec(this._codecPreference, this._codecProfiles)
            // }

            // @TODO: Implement codec preferences and auto-sorting of best to use codecs / profiles

            // console.log('Available codecs on cient:', this._sdpHelper.getAvailableCodecs())

            this._peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }).then((offer) => {
                const playerOffer = this._sdpHelper.setLocalSDP(offer)
                this._peerConnection.setLocalDescription(playerOffer)

                resolve(offer)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    setRemoteOffer(sdpRemote:string){
        this._sdpHelper.setRemoteSDP(sdpRemote)
        try {
            this._peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: sdpRemote,
            })
        } catch(e){
            console.log('xCloudPlayer Library.ts - setRemoteOffer() Remote SDP is not valid:', sdpRemote)
        }
    }

    getIceCandidates() {
        return this._iceHelper.getCandidates()
    }

    setRemoteIceCandidates(candidates:Array<any>) {
        // @TODO: Sort ipv4 and ipv6, and use best route as preference (ipv6 only etc)

        // Convert Teredo to external ip
        for(const candidate in candidates){
            const candidateAddress = candidates[candidate].candidate.split(' ')
                        
            if(candidateAddress.length > 4 && candidateAddress[4].substr(0, 4) === '2001'){
                const teredo = new Teredo(candidateAddress[4])

                candidates.push({
                    candidate: 'a=candidate:10 1 UDP 1 '+teredo.getIpv4Address()+' 9002 typ host ',
                    messageType: 'iceCandidate',
                    sdpMLineIndex: candidates[candidate].sdpMLineIndex,
                    sdpMid: candidates[candidate].sdpMid,
                })
                candidates.push({
                    candidate: 'a=candidate:11 1 UDP 1 '+teredo.getIpv4Address()+' '+teredo.getIpv4Port()+' typ host ',
                    messageType: 'iceCandidate',
                    sdpMLineIndex: candidates[candidate].sdpMLineIndex,
                    sdpMid: candidates[candidate].sdpMid,
                })
            }
        }

        this._iceHelper.setRemoteCandidates(candidates)
    }

    destroy() {
        if(this._isDestoyed === false){
            this._peerConnection.close()
            
            for(const channel in this._channels) {
                this._channels[channel].destroy()
            }

            if(this._videoComponent){ this._videoComponent.destroy() }
            if(this._audioComponent){ this._audioComponent.destroy() }

            this._isDestoyed = true
        } else {
            throw new Error('Cannot destroy because the player is already destroyed.')
        }
    }
}