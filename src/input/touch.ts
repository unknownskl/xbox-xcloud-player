import xCloudPlayer from '../player'

export default class Touch {
    private _player: xCloudPlayer | undefined
    private _index: number

    private _pointerEvents = {}
    private _lastPointerId = -1

    constructor(index:number){
        this._index = index
    }

    attach(xCloudPlayer:xCloudPlayer){
        this._player = xCloudPlayer

        this._player._channels.control.sendGamepadState(this._index, true)

        // Mod the video UI to capture MKB input
        if(this._player.getVideoElement() === undefined){
            console.log('VideoComponent is not attached. this._player._videoComponent is:', this._player.getVideoElement())
            return
        } else {
            this.loadEventListeners(this._player.getVideoElement() as HTMLVideoElement)
        }

    }

    detach(){
        if(this._player === undefined){
            console.log('Player is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)
    }

    loadEventListeners(videoElement:HTMLVideoElement){
        videoElement.addEventListener('pointermove', (e) => this.onPointer(e), { passive: false })
        videoElement.addEventListener('pointerdown', (e) => { this.onPointer(e); e.preventDefault()}, { passive: false })
        videoElement.addEventListener('pointerup', (e) => { this.onPointer(e); e.preventDefault()}, { passive: false })
    }

    onPointer(event:PointerEvent) {

        if(this._pointerEvents[event.pointerId] === undefined){
            this._pointerEvents[event.pointerId] = {
                events: [event],
            }
        }

        this._pointerEvents[event.pointerId].events.push(event)

        if(this._lastPointerId !== event.pointerId){
            if(this._lastPointerId >= 0){
                this._player?._channels.input.queuePointerFrame(this._pointerEvents[this._lastPointerId])
                delete this._pointerEvents[this._lastPointerId]
            }
            this._lastPointerId = event.pointerId
        }
        // this._player?._channels.input.queuePointerFrame(event)
    }

}