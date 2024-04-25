// import DebugChannel from './channel/debug'
import ChatChannel from './channel/chat'
import ControlChannel from './channel/control'
import InputChannel from './channel/input'
import MessageChannel from './channel/message'

import Ice from './lib/ice'
import Sdp from './lib/sdp'

import VideoComponent from './render/video'
import AudioComponent from './render/audio'

export interface xCloudPlayerConfig {
    audio_mono?: boolean;
    audio_bitrate?: number;
    video_bitrate?: number;
    keyframe_interval?: number;
}
export interface xCloudPlayerConfigProperties extends Required<xCloudPlayerConfig> {}

export default class xCloudPlayer {
    _peerConnection = new RTCPeerConnection({})
    _channels = {
        chat: new ChatChannel(this),
        control: new ControlChannel(this),
        input: new InputChannel(this),
        message: new MessageChannel(this),
    }

    _config:xCloudPlayerConfigProperties = {
        audio_mono: false,
        audio_bitrate: 0,
        video_bitrate: 0,
        keyframe_interval: 5,
    }

    private _elementId: string
    private _isDestoyed = false

    private _sdpHelper = new Sdp(this)
    private _iceHelper = new Ice(this)
    private _videoComponent: VideoComponent | undefined
    private _audioComponent: AudioComponent | undefined

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
            this._peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }).then((offer) => {
                const playerOffer = this._sdpHelper.setLocalSDP(offer)
                this._peerConnection.setLocalDescription(playerOffer)

                resolve(playerOffer)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    setRemoteOffer(sdpRemote:string){
        const finalSdp = this._sdpHelper.setRemoteSDP(sdpRemote)
        try {
            this._peerConnection.setRemoteDescription({
                type: 'answer',
                sdp: finalSdp,
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

        this._iceHelper.setRemoteCandidates(candidates)
    }

    getVideoElement() {
        if(this._videoComponent){
            return this._videoComponent.getElement()
        } else {
            return undefined
        }
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