import xCloudPlayer from '../player'

export default class MouseKeyboard {
    private _player: xCloudPlayer | undefined
    private _index: number
    private _videoElement: HTMLVideoElement | undefined

    private _listener = {
        keyDown: this.onKeyDown.bind(this),
        keyUp: this.onKeyUp.bind(this),
        pointerMove: this.onPointerMove.bind(this),
        pointerClick: this.onPointerClick.bind(this),
        pointerScroll: this.onPointerScroll.bind(this),
        lockMouseKeyboard: this.lockMouseKeyboard.bind(this),
        contextMenu: this.onContextMenu.bind(this),
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
            console.log('[MKB] VideoComponent is not attached. this._player._videoComponent is:', videoElement)
            return
        } else {
            this._videoElement = videoElement
            this._videoElement.addEventListener('pointermove', this._listener.pointerMove)
            this._videoElement.addEventListener('pointerdown', this._listener.pointerClick)
            this._videoElement.addEventListener('pointerup', this._listener.pointerClick)
            this._videoElement.addEventListener('wheel', this._listener.pointerScroll)
            this._videoElement.addEventListener('click', this._listener.lockMouseKeyboard)
            this._videoElement.addEventListener('contextmenu', this._listener.contextMenu)
    
            window.addEventListener('keydown', this._listener.keyDown)
            window.addEventListener('keyup', this._listener.keyUp)
        }

    }

    detach(){
        if(this._player === undefined){
            console.log('[MKB] Player is not attached. this._player is:', this._player)
            return
        }

        this._player._channels.control.sendGamepadState(this._index, false)

        window.removeEventListener('keydown', this._listener.keyDown)
        window.removeEventListener('keyup', this._listener.keyUp)
        
        const videoElement = this._videoElement ?? this._player.getVideoElement()
        if(videoElement !== undefined){
            videoElement.removeEventListener('pointermove', this._listener.pointerMove)
            videoElement.removeEventListener('pointerdown', this._listener.pointerClick)
            videoElement.removeEventListener('pointerup', this._listener.pointerClick)
            videoElement.removeEventListener('wheel', this._listener.pointerScroll)
            videoElement.removeEventListener('click', this._listener.lockMouseKeyboard)
            videoElement.removeEventListener('contextmenu', this._listener.contextMenu)
        }

        this._videoElement = undefined
        this._player = undefined
    }

    onContextMenu(event:MouseEvent):void{
        event.preventDefault()
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
        console.log('[MKB] Pointer scrolled:', event)
    }

    onKeyDown(event:KeyboardEvent){
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: true,
        })
        event.preventDefault()
    }

    onKeyUp(event:KeyboardEvent){
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: false,
        })
    }

    lockMouseKeyboard(){
        if(this._player === undefined || this._player.getVideoElement() === undefined){
            console.log('[MKB] Player or VideoComponent is not attached. Failed to lock Mouse & Keyboard because there is nothing to lock for.')
            return
        }

        // @disable ts-expect-error requestPointerLock() is not defined to consume arguments
        const promise = this._player?.getVideoElement()?.requestPointerLock({
            unadjustedMovement: true,
        }) as Promise<undefined> | undefined

        if(promise === undefined){
            console.log('[MKB] Failed to lock Mouse & Keyboard because the requestPointerLock() is undefined')
            return
        }

        if ('keyboard' in navigator && 'lock' in (navigator.keyboard as any)) {
            Promise.resolve(document.body.requestFullscreen()).then(() => {
                return (navigator as any).keyboard.lock?.()
            }).catch((error) => {
                console.log('[MKB] Fullscreen or keyboard lock failed:', error)
            })
        } else {
            console.log('[MKB] Keyboard lock is not supported. Error:', 'NotSupportedError')
            return
        }
      
        promise.then(() => {
            console.log('[MKB] pointer is locked')
        }).catch((error) => {
            if (error.name === 'NotSupportedError') {
                console.log('[MKB] Mouse pointer lock is not supported. Error:', 'NotSupportedError')
            }
        })
    }

}