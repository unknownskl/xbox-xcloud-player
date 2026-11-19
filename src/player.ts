// import DebugChannel from './channel/debug'
import ChatChannel from './channel/chat'
import ControlChannel from './channel/control'
import InputChannel from './channel/input'
import MessageChannel from './channel/message'

import Ice from './lib/ice'
import Sdp from './lib/sdp'
import Stats from './lib/stats'

import VideoComponent from './render/video'
import AudioComponent from './render/audio'

export interface xCloudPlayerConfig {
    audio_mono?: boolean;
    audio_bitrate?: number;
    video_bitrate?: number;
    keyframe_interval?: number;
}
export default class xCloudPlayer {
    _peerConnection = new RTCPeerConnection({})
    _channels = {
        chat: new ChatChannel(this),
        control: new ControlChannel(this),
        input: new InputChannel(this),
        message: new MessageChannel(this),
    }

    _config:Required<xCloudPlayerConfig> = {
        audio_mono: false,
        audio_bitrate: 0,
        video_bitrate: 0,
        keyframe_interval: 5,
    }

    private _elementId: string
    private _isDestoyed = false

    private _sdpHelper = new Sdp(this)
    private _iceHelper = new Ice(this)
    private _statsHelper = new Stats(this)
    private _videoComponent: VideoComponent | undefined
    private _audioComponent: AudioComponent | undefined

    _sdpHandler: ((offer: RTCSessionDescriptionInit) => void) | undefined = undefined

    constructor(elementId:string, options:xCloudPlayerConfig = {}) {
        this._elementId = elementId
        this._config = {
            ...this._config,
            ...options,
        }

        this._peerConnection.addTransceiver('audio', { direction: 'sendrecv' })
        const videoTransceiver = this._peerConnection.addTransceiver('video', { direction: 'recvonly' })
        videoTransceiver.setCodecPreferences(this._sdpHelper.getDefaultCodecPreferences())

        this._peerConnection.ontrack = (event) => {
            const stream = event.streams[0]
            if(stream === undefined){
                return
            }

            if(event.track.kind === 'video'){
                this._videoComponent?.destroy()
                this._videoComponent = new VideoComponent(this)
                this._videoComponent.create(stream)

            } else if(event.track.kind === 'audio'){
                this._audioComponent?.destroy()
                this._audioComponent = new AudioComponent(this)
                this._audioComponent.create(stream)

            } else {
                console.log('[xPlayer] Detected an unknown stream type: ', event.track.kind)
            }
        }
    }

    getElementId(){ return this._elementId }

    onConnectionStateChange(callback: (state: string) => void) {
        this._peerConnection.onconnectionstatechange = () => {
            callback(this._peerConnection.connectionState)
        }
    }

    setChatSdpHandler(callback: (offer: RTCSessionDescriptionInit) => void) {
        this._sdpHandler = callback
    }

    createOffer() {
        return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
            this._peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }).then((offer) => {
                const playerOffer = this._sdpHelper.setLocalSDP(offer)
                return Promise.resolve(this._peerConnection.setLocalDescription(playerOffer)).then(() => {
                    resolve(playerOffer)
                })
            }).catch((error) => {
                reject(error)
            })
        })
    }

    setRemoteOffer(sdpRemote:string){
        const finalSdp = this._sdpHelper.setRemoteSDP(sdpRemote)
        try {
            Promise.resolve(this._peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: finalSdp,
            })).catch((e) => {
                console.log('[xPlayer] setRemoteOffer() Remote SDP is not valid:', sdpRemote, e)
            })
        } catch(e){
            console.log('[xPlayer] setRemoteOffer() Remote SDP is not valid:', sdpRemote, e)
        }
    }

    getIceCandidates() {
        return this._iceHelper.getCandidates()
    }

    setRemoteIceCandidates(candidates:Array<any>) {
        // @TODO: Sort ipv4 and ipv6, and use best route as preference (ipv6 only etc)

        this._iceHelper.setRemoteCandidates(candidates)
    }

    getVideoElement() {
        if(this._videoComponent){
            return this._videoComponent.getElement()
        } else {
            return undefined
        }
    }

    getAudioElement() {
        if(this._audioComponent){
            return this._audioComponent.getElement()
        } else {
            return undefined
        }
    }

    toggleDebugOverlay() {
        if(this._videoComponent){
            this._videoComponent.toggleDebugOverlay()
        }
    }

    getStats() {
        return this._statsHelper
    }

    destroy() {
        if(this._isDestoyed === false){
            for(const channel of Object.values(this._channels)) {
                channel.destroy()
            }

            this._statsHelper.destroy()
            this._iceHelper.destroy()

            if(this._videoComponent){
                this._videoComponent.destroy()
                this._videoComponent = undefined
            }
            if(this._audioComponent){
                this._audioComponent.destroy()
                this._audioComponent = undefined
            }

            this._peerConnection.close()

            if(this._peerConnection.onconnectionstatechange){
                this._peerConnection.onconnectionstatechange(new Event('connectionstatechanged'))
            }

            this._isDestoyed = true
        } else {
            console.log('Cannot destroy because the player is already destroyed.')
        }
    }
}