import xCloudPlayer from '../player'

export default class Touch {
    private _player: xCloudPlayer | undefined
    private _index: number
    private _videoElement: HTMLVideoElement | undefined

    private _pointerEvents = {}
    private _lastPointerId = -1

    private _mouseDown = false

    private _listener = {
        onPointer: this.onPointer.bind(this),
    }

    constructor(index:number){
        this._index = index
    }

    attach(xCloudPlayer:xCloudPlayer){
        this._player = xCloudPlayer

        this._player._channels.control.sendGamepadState(this._index, true, this)

        const videoElement = this._player.getVideoElement()

        // Mod the video UI to capture MKB input
        if(videoElement === undefined){
            console.log('VideoComponent is not attached. this._player._videoComponent is:', videoElement)
            return
        } else {
            this._videoElement = videoElement
            this._videoElement.addEventListener('pointermove', this._listener.onPointer, { passive: false })
            this._videoElement.addEventListener('pointerdown', this._listener.onPointer, { passive: false })
            this._videoElement.addEventListener('pointerup', this._listener.onPointer, { passive: false })
        }

    }

    detach(){
        if(this._player === undefined){
            console.log('Player is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)

        const videoElement = this._videoElement ?? this._player.getVideoElement()
        if(videoElement !== undefined){
            videoElement.removeEventListener('pointermove', this._listener.onPointer)
            videoElement.removeEventListener('pointerdown', this._listener.onPointer)
            videoElement.removeEventListener('pointerup', this._listener.onPointer)
        }

        this._videoElement = undefined
        this._player = undefined
    }

    onPointer(event:PointerEvent) {
        this._lastPointerId = event.pointerId

        if(event.pointerType === 'mouse' && event.type === 'pointerdown'){
            this._mouseDown = true
        }

        if(event.pointerType === 'mouse' && event.type === 'pointerup'){
            this._mouseDown = false
        }

        if(event.pointerType === 'mouse' && event.type === 'pointermove' && this._mouseDown === false){
            // ignore events if the pointer type is mouse and is not pressed.
        } else {
            this._player?._channels.input.queuePointerFrame({
                events: [event],
            })
        }
        event.preventDefault()
    }

}