import xCloudPlayer from '../player'

export default class MouseKeyboard {
    private _player: xCloudPlayer | undefined
    private _index: number

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
            console.log('Gamepad is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)
    }

    loadEventListeners(videoElement:HTMLVideoElement){
        videoElement.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false })
        videoElement.addEventListener('pointerdown', (e) => { this.onPointerClick(e); e.preventDefault()}, { passive: false })
        videoElement.addEventListener('pointerup', (e) => { this.onPointerClick(e); e.preventDefault()}, { passive: false })
        videoElement.addEventListener('wheel', (e) => this.onPointerScroll(e), { passive: false })

        window.addEventListener('keydown', event => this.onKeyDown(event))
        window.addEventListener('keyup', event => this.onKeyUp(event))

        videoElement.addEventListener('contextmenu', event => {
            event.preventDefault()
        })

        // document.addEventListener('contextmenu', event => {
        //     event.preventDefault();
        // });
    }

    onPointerMove(event:PointerEvent){
        this._player?._channels.input.queueMouseFrame({
            X: event.movementX*2,
            Y: event.movementY*2,
            WheelX: 0,
            WheelY: 0,
            Buttons: event.buttons,
            Relative: 0, // 0 = Relative, 1 = Absolute
        })
    }

    onPointerClick(event:PointerEvent){
        // console.log('Pointer clicked:', event)
        this._player?._channels.input.queueMouseFrame({
            X: event.movementX*2,
            Y: event.movementY*2,
            WheelX: 0,
            WheelY: 0,
            Buttons: event.buttons,
            Relative: 0, // 0 = Relative, 1 = Absolute
        })
    }

    onPointerScroll(event:WheelEvent){
        console.log('Pointer scrolled:', event)
    }

    onKeyDown(event:KeyboardEvent){
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: true,
        })
    }

    onKeyUp(event:KeyboardEvent){
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: false,
        })
    }

}