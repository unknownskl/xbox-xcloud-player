import xCloudPlayer from '../player'
import Overlay from './overlay'

export default class VideoComponent {
    private _player:xCloudPlayer

    private _element:HTMLVideoElement | undefined
    private _overlay:Overlay

    constructor(player:xCloudPlayer){
        this._player = player
        this._overlay = new Overlay(this, this._player)
    }

    create(stream:MediaStream):void {
        const videoElement = document.createElement('video')
        videoElement.srcObject = stream
        videoElement.autoplay = true
        videoElement.muted = true
        videoElement.playsInline = true
        videoElement.style.width = '100%'
        videoElement.style.height = '100%'
        videoElement.style.objectFit = 'contain'
        videoElement.style.backgroundColor = 'black'
        videoElement.style.touchAction = 'none'

        const element = document.getElementById(this._player.getElementId())
        if(element === null) {return}

        this._element = videoElement
        element.appendChild(this._element)
        const isStatic = getComputedStyle(element).position === 'static' ? true : false
        if(isStatic === true){
            element.style.position = 'relative'
        }

        this._element.requestVideoFrameCallback(this.processVideoMetadata.bind(this))
    }

    processVideoMetadata(_timestamp:DOMHighResTimeStamp, data:VideoFrameCallbackMetadata):void {
        if(this._element === undefined) {return}

        this._element.requestVideoFrameCallback(this.processVideoMetadata.bind(this))

        this._player._channels.input.queueMetadataFrame({
            serverDataKey: data.rtpTimestamp as number,
            firstFramePacketArrivalTimeMs: data.receiveTime as number,
            frameSubmittedTimeMs: data.receiveTime as number,
            frameDecodedTimeMs: data.expectedDisplayTime,
            frameRenderedTimeMs: data.expectedDisplayTime,
        })
    }

    getElement():HTMLVideoElement | undefined{
        return this._element
    }

    toggleDebugOverlay():void{
        this._overlay.toggleDebug()
    }

    destroy():void{
        const streamHolder = document.getElementById(this._player.getElementId())
        const element = streamHolder?.querySelector('video')

        if(this._overlay !== undefined){
            this._overlay.destroy()
        }

        if(element){
            element.remove()
        }
    }
}