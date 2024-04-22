import xCloudPlayer from '../player'

export default class Gamepad {
    private _player: xCloudPlayer | undefined
    private _index: number

    constructor(index:number){
        this._index = index
    }

    attach(xCloudPlayer:xCloudPlayer){
        this._player = xCloudPlayer

        this._player._channels.control.sendGamepadState(this._index, true)
    }

    detach(){
        if(this._player === undefined){
            console.log('Player is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)

    }

    sendButtonState(button, value){
        if(this._player === undefined){
            console.log('Player is not attached. this._player is:', this._player)
            return
        }

        if(! (button in this.getDefaultFamepadFrame())){
            console.log('Invalid button:', button)
            return
        } else {

            const buttonPreset = this.getDefaultFamepadFrame()
            buttonPreset.GamepadIndex = this._index
            buttonPreset[button] = value

            return this._player._channels.input.queueGamepadFrame(buttonPreset)
        }
    }

    getDefaultFamepadFrame(){
        return {
            GamepadIndex: 0,
            Nexus: 0,
            Menu: 0,
            View: 0,
            A: 0,
            B: 0,
            X: 0,
            Y: 0,
            DPadUp: 0,
            DPadDown: 0,
            DPadLeft: 0,
            DPadRight: 0,
            LeftShoulder: 0,
            RightShoulder: 0,
            LeftThumb: 0,
            RightThumb: 0,

            LeftThumbXAxis: 0,
            LeftThumbYAxis: 0,
            RightThumbXAxis: 0,
            RightThumbYAxis: 0,
            LeftTrigger: 0,
            RightTrigger: 0,
        }
    }
}