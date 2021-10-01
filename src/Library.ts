import DebugChannel from './Channel/Debug'
import VideoChannel from './Channel/Video'
import AudioChannel from './Channel/Audio'
import InputChannel from './Channel/Input'
import ControlChannel from './Channel/Control'
import MessageChannel from './Channel/Message'

import EventBus from './Helper/EventBus'

import GamepadDriver from './Driver/Gamepad'

interface xCloudPlayerConfig {
    libopus_path?:string;
    worker_location?:string;
    ui_systemui?:Array<number>; // Default: [10,19,31,27,32,33]
    ui_version?:Array<number>; // Default: [0,1,0]
    input_driver?:any; // Default: GamepadDriver(), false to disable
}

export default class xCloudPlayer {

    _config:xCloudPlayerConfig
    _webrtcClient:RTCPeerConnection;

    _eventBus:EventBus

    _webrtcConfiguration = {
        iceServers: [{
            urls: 'stun:stun.l.google.com:19302',
        }, {
            urls: 'stun:stun1.l.google.com:19302',
        }],
    }
    // _webrtcConfiguration = {
    //     iceServers: []
    // }

    _webrtcDataChannelsConfig = {
        'video': {
            id: 1,
            ordered: true,
            protocol: '1.0',
        },
        'audio': {
            id: 2,
            maxRetransmits: 0,
            ordered: true,
            protocol: 'audioV1',
        },
        'input': {
            id: 3,
            ordered: true,
            protocol: '1.0',
        },
        'control': {
            id: 4,
            protocol: 'controlV1',
        },
        'message': {
            id: 5,
            protocol: 'messageV1',
        },
        'chat': {
            id: 6,
            protocol: 'chatV1',
        },
    }

    _webrtcStates = {
        iceGathering: 'open',
        iceConnection: 'open',
        iceCandidates: [],
        streamConnection: 'open',
    }

    _webrtcDataChannels = {}
    _webrtcChannelProcessors = {}

    _iceCandidates:Array<RTCIceCandidate> = []

    _elementHolder:string
    _elementHolderRandom:number

    _inputDriver:any = undefined

    // _events = {
    //     'connectionstate': []
    // }

    constructor(elementId:string, config:xCloudPlayerConfig = {}) {
        console.log('xCloudPlayer loaded!')

        this._config = config

        this._eventBus = new EventBus()
        this._elementHolder = elementId
        this._elementHolderRandom = (Math.floor(Math.random() * 100) + 1)

        this._webrtcClient = new RTCPeerConnection(this._webrtcConfiguration)
        this._openDataChannels()

        if(this._config.input_driver === undefined){
            this._inputDriver = new GamepadDriver()

        } else if(this._config.input_driver !== null){
            this._inputDriver = this._config.input_driver
        }

        this._inputDriver.setApplication(this)

        this._gatherIce()
    }

    createOffer(){
        return new Promise((resolve) => {

            this._inputDriver.start()

            this.getEventBus().emit('connectionstate', { state: 'new'})

            this._webrtcClient.createOffer().then((offer) => {
                this._webrtcClient.setLocalDescription(offer)
                
                resolve(offer)
            })
        })
    }

    setRemoteOffer(sdpdata:string){
        // console.log('sdpData', sdpdata)
        this._webrtcClient.setRemoteDescription({
            type: 'answer',
            sdp: sdpdata,
        })

        this.getEventBus().emit('connectionstate', { state: 'connecting'})
    }

    reset(){
        this._webrtcClient.close()
        
        // Close data channels
        for(const name in this._webrtcChannelProcessors){
            this._webrtcChannelProcessors[name].destroy()
        }

        this._inputDriver.stop()

        this._webrtcClient = new RTCPeerConnection(this._webrtcConfiguration)
        this._openDataChannels()
        this._inputDriver.start()

        this._gatherIce()
    }

    getIceCandidates(){
        return this._iceCandidates
    }

    setIceCandidates(iceDetails){
        for(const candidate in iceDetails){
            if(iceDetails[candidate].candidate === 'a=end-of-candidates'){
                iceDetails[candidate].candidate = ''
            }

            this._webrtcClient.addIceCandidate({
                candidate: iceDetails[candidate].candidate,
                sdpMid: iceDetails[candidate].sdpMid,
                sdpMLineIndex: iceDetails[candidate].sdpMLineIndex,
            })
        }
    }

    getChannel(name:string){
        return this._webrtcDataChannels[name]
    }

    _openDataChannels(){
        for(const channel in this._webrtcDataChannelsConfig){
            this._openDataChannel(channel, this._webrtcDataChannelsConfig[channel])
        }
    }

    _openDataChannel(name:string, config){
        console.log('xCloudPlayer Library.ts - Creating data channel:', name, config)

        this._webrtcDataChannels[name] = this._webrtcClient.createDataChannel(name, config)

        switch(name) {
            case 'video':
                this._webrtcChannelProcessors[name] = new VideoChannel('video', this)
                break
            case 'audio':
                this._webrtcChannelProcessors[name] = new AudioChannel('audio', this)
                break
            case 'input':
                this._webrtcChannelProcessors[name] = new InputChannel('input', this)
                break
            case 'control':
                this._webrtcChannelProcessors[name] = new ControlChannel('control', this)
                break
            case 'chat':
                this._webrtcChannelProcessors[name] = new DebugChannel('chat', this)
                break
            case 'message':
                this._webrtcChannelProcessors[name] = new MessageChannel('message', this)
                break
        }

        // Setup channel processors
        this._webrtcDataChannels[name].addEventListener('open', (event) => {
            // const message = event.data;
            if(this._webrtcChannelProcessors[name] !== undefined && this._webrtcChannelProcessors[name].onOpen !== undefined){
                this._webrtcChannelProcessors[name].onOpen(event)
            } else {
                console.log('xCloudPlayer Library.ts - ['+name+'] Got open channel:', event)
            }
        })
    
        this._webrtcDataChannels[name].addEventListener('message', event => {
            // const message = new Uint8Array(event.data);
            if(this._webrtcChannelProcessors[name] !== undefined && this._webrtcChannelProcessors[name].onMessage !== undefined){
                this._webrtcChannelProcessors[name].onMessage(event)
            } else {
                console.log('xCloudPlayer Library.ts - ['+name+'] Received channel message:', event)
            }
        })

        this._webrtcDataChannels[name].addEventListener('closing', event => {
            // const message = event.data;
            if(this._webrtcChannelProcessors[name] !== undefined && this._webrtcChannelProcessors[name].onClosing !== undefined){
                this._webrtcChannelProcessors[name].onClosing(event)
            } else {
                console.log('xCloudPlayer Library.ts - ['+name+'] Got closing channel:', event)
            }
        })

        this._webrtcDataChannels[name].addEventListener('close', event => {
            // const message = event.data;
            if(this._webrtcChannelProcessors[name] !== undefined && this._webrtcChannelProcessors[name].onClose !== undefined){
                this._webrtcChannelProcessors[name].onClose(event)
            } else {
                console.log('xCloudPlayer Library.ts - ['+name+'] Got close channel:', event)
            }
        })

        this._webrtcDataChannels[name].addEventListener('error', event => {
            // const message = event.data;
            if(this._webrtcChannelProcessors[name] !== undefined && this._webrtcChannelProcessors[name].onError !== undefined){
                this._webrtcChannelProcessors[name].onError(event)
            } else {
                console.log('xCloudPlayer Library.ts - ['+name+'] Got error channel:', event)
            } 
        })

        // Check if we have a video connection
        if(name === 'video'){
            this._webrtcChannelProcessors[name].addEventListener('state', (event) => {
                this._webrtcStates.streamConnection = event.state

                this.getEventBus().emit('connectionstate', { state: event.state})
                console.log('xCloudPlayer Library.ts - ['+name+'] Channel state changed to:', event)
            })
        }
    }

    _gatherIce(){
        this._webrtcClient.addEventListener('icecandidate', event => {
            if (event.candidate) {
                console.log('xCloudPlayer Library.ts - ICE candidate found:', event.candidate)
                this._iceCandidates.push(event.candidate)
            }
        })
    }

    getDataChannel(name:string) {
        return this._webrtcDataChannels[name]
    }

    getChannelProcessor(name:string) {
        return this._webrtcChannelProcessors[name]
    }

    getEventBus() {
        return this._eventBus
    }

}