import xCloudPlayer from '../player'

interface NavigatorWithKeyboard extends Navigator {
    keyboard?: {
        lock?: () => Promise<void>;
    };
}

export default class MouseKeyboard {
    private _player: xCloudPlayer | undefined
    private _index: number

    private _listener = {
        keyDown: this.onKeyDown.bind(this),
        keyUp: this.onKeyUp.bind(this),
        pointerMove: this.onPointerMove.bind(this),
        pointerClick: this.onPointerClick.bind(this),
        pointerScroll: this.onPointerScroll.bind(this),
        lockMouseKeyboard: this.lockMouseKeyboard.bind(this),
    }


    constructor(index:number){
        this._index = index
    }

    attach(xCloudPlayer:xCloudPlayer):void{
        this._player = xCloudPlayer

        this._player._channels.control.sendGamepadState(this._index, true, this)

        // Mod the video UI to capture MKB input
        if(this._player.getVideoElement() === undefined){
            console.log('[MKB] VideoComponent is not attached. this._player._videoComponent is:', this._player.getVideoElement())
            return
        } else {
            this._player.getVideoElement()?.addEventListener('pointermove', this._listener.pointerMove)
            this._player.getVideoElement()?.addEventListener('pointerdown', this._listener.pointerClick)
            this._player.getVideoElement()?.addEventListener('pointerup', this._listener.pointerClick)
            this._player.getVideoElement()?.addEventListener('wheel', this._listener.pointerScroll)
            this._player.getVideoElement()?.addEventListener('click', this._listener.lockMouseKeyboard)
    
            window.addEventListener('keydown', this._listener.keyDown)
            window.addEventListener('keyup', this._listener.keyUp)
    
            this._player.getVideoElement()?.addEventListener('contextmenu', event => {
                event.preventDefault()
            })
        }

    }

    detach():void{
        if(this._player === undefined){
            console.log('[MKB] Player is not attached. this._player is:', this._player)
            return
        }

        this._player._channels.control.sendGamepadState(this._index, false)

        window.removeEventListener('keydown', this._listener.keyDown)
        window.removeEventListener('keyup', this._listener.keyUp)
        
        this._player.getVideoElement()?.removeEventListener('pointermove', this._listener.pointerMove)
        this._player.getVideoElement()?.removeEventListener('pointerdown', this._listener.pointerClick)
        this._player.getVideoElement()?.removeEventListener('pointerup', this._listener.pointerClick)
        this._player.getVideoElement()?.removeEventListener('wheel', this._listener.pointerScroll)
        this._player.getVideoElement()?.removeEventListener('click', this._listener.lockMouseKeyboard)
    }

    onPointerMove(event:PointerEvent):void{
        this._player?._channels.input.queueMouseFrame({
            X: event.movementX*2,
            Y: event.movementY*2,
            WheelX: 0,
            WheelY: 0,
            Buttons: event.buttons,
            Relative: 0, // 0 = Relative, 1 = Absolute
        })
    }

    onPointerClick(event:PointerEvent):void{
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

    onPointerScroll(event:WheelEvent):void{
        console.log('[MKB] Pointer scrolled:', event)
    }

    onKeyDown(event:KeyboardEvent):void{
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: true,
        })
        event.preventDefault()
    }

    onKeyUp(event:KeyboardEvent):void{
        this._player?._channels.input.queueKeyboardFrame({
            key: event.key,
            keyCode: event.keyCode,
            pressed: false,
        })
    }

    lockMouseKeyboard():void{
        const videoElement = this._player?.getVideoElement()
        if(this._player === undefined || videoElement === undefined){
            console.log('[MKB] Player or VideoComponent is not attached. Failed to lock Mouse & Keyboard because there is nothing to lock for.')
            return
        }

        const promise = videoElement.requestPointerLock({
            unadjustedMovement: true,
        }) as Promise<void> | undefined

        if(promise === undefined){
            console.log('[MKB] Failed to lock Mouse & Keyboard because the requestPointerLock() is undefined')
            return
        }

        const nav = navigator as NavigatorWithKeyboard
        if (nav.keyboard !== undefined && typeof nav.keyboard.lock === 'function') {
            const keyboardLock = nav.keyboard.lock.bind(nav.keyboard)
            document.body.requestFullscreen().then(() => {
                void keyboardLock()
            })
        } else {
            console.log('[MKB] Keyboard lock is not supported. Error:', 'NotSupportedError')
            return
        }
      
        promise.then(() => {
            console.log('[MKB] pointer is locked')
        }).catch((error: { name?: string }) => {
            if (error.name === 'NotSupportedError') {
                console.log('[MKB] Mouse pointer lock is not supported. Error:', 'NotSupportedError')
            }
        })
    }

}