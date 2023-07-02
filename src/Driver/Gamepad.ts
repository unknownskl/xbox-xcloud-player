import xCloudPlayer from '../Library'
import { InputFrame, InputDriver, PollCallback, RumbleCallback } from '../Channel/Input'

interface GamepadDriverData {
    idx: number;
}

export default class GamepadDriver implements InputDriver<GamepadDriverData> {


    _application: xCloudPlayer | null = null

    _rumbleTimers: Array<NodeJS.Timer | undefined> = [];

    _gamepads: Array<any> = []
    _activeGamepadIndex = -1;

    // constructor() {
    // }

    setApplication(application: xCloudPlayer) {
        this._application = application
    }

    start(
        onNewDevice: (poll: PollCallback<GamepadDriverData>, rumble: RumbleCallback<GamepadDriverData>, deviceObject: GamepadDriverData) => void,
        /*
        onRemovedDevice: (device: InputDevice<number>) => void
        */
    ) {

        window.addEventListener('gamepadconnected', (e) => {
            const gp = navigator.getGamepads()[e.gamepad.index]
            if (gp === null) {
                console.log('Connected null gamepad')
                return
            }

            const newDevice: GamepadDriverData = {
                idx: e.gamepad.index,
            }

            onNewDevice(
                GamepadDriver.poll,
                (
                    device, delayMs, durationMS,
                    rightMotorPercent, leftMotorPercent,
                    rightTriggerMotorPercent, leftTriggerMotorPercent, repeat
                ) => {
                    this.rumbleDevice(
                        device, delayMs, durationMS,
                        rightMotorPercent, leftMotorPercent,
                        rightTriggerMotorPercent, leftTriggerMotorPercent, repeat
                    )
                },
                newDevice,
            )
            for (const rumbleTimer of this._rumbleTimers) {
                if (rumbleTimer) {
                    clearInterval(rumbleTimer)
                }
            }
            this._rumbleTimers = new Array(navigator.getGamepads().length)
        })
    }

    stop() {
        for (const rumbleTimer of this._rumbleTimers) {
            if (rumbleTimer) {
                clearInterval(rumbleTimer)
            }
        }
        // console.log('xCloudPlayer Driver/Gamepad.ts - Stop collecting events:', this._gamepads)
    }

    static poll(gamepadData: GamepadDriverData): InputFrame | null {
        const gamepads = navigator.getGamepads()
        const gamepadState = gamepads[gamepadData.idx]
        if (gamepadState !== null) {
            console.log("Polled Gamestate from", gamepadData.idx)
            const state = GamepadDriver.mapStateLabels(gamepadState.buttons, gamepadState.axes)
            return state
        }
        return null
    }

    rumbleDevice(
        device: GamepadDriverData,
        delayMs: number,
        durationMs: number,
        rightMotorPercent: number,
        leftMotorPercent: number,
        rightTriggerMotorPercent: number,
        leftTriggerMotorPercent: number,
        repeat: number,
    ) {
        // Check if we have an active gamepad and rumble enabled
        console.log('Rumbling', device.idx)
        const gamepad = navigator.getGamepads()[device.idx]
        if (gamepad === null) {
            console.log('No Gamepad at index', device.idx)
            return
        }

        if ((gamepad as any).vibrationActuator === undefined) {
            console.log('Gamepad at index does not support vibrationAcutator', device.idx)
            return
        }

        const rumbleData = {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude: rightMotorPercent,
            strongMagnitude: leftMotorPercent,

            leftTrigger: leftTriggerMotorPercent,
            rightTrigger: rightTriggerMotorPercent,
        }

        if (this._rumbleTimers[device.idx]) {
            clearInterval(this._rumbleTimers[device.idx])
        }

        if ((gamepad as any).vibrationActuator.type === 'dual-rumble') {
            const intensityRumble = rightMotorPercent < .6 ? (.6 - rightMotorPercent) / 2 : 0
            const intensityRumbleTriggers = (leftTriggerMotorPercent + rightTriggerMotorPercent) / 4
            const endIntensity = Math.min(intensityRumble, intensityRumbleTriggers)

            rumbleData.weakMagnitude = Math.min(1, rightMotorPercent + endIntensity)

            // Set triggers as we have changed the motor rumble already
            rumbleData.leftTrigger = 0
            rumbleData.rightTrigger = 0
        }

        (gamepad as any).vibrationActuator.playEffect((gamepad as any).vibrationActuator.type, rumbleData)

        if (repeat > 0) {
            let repeatCount = repeat

            this._rumbleTimers[device.idx] = setInterval(() => {
                if (repeatCount <= 0) {
                    if (this._rumbleTimers[device.idx]) {
                        clearInterval(this._rumbleTimers[device.idx])
                    }
                }

                if ((gamepad as any).vibrationActuator !== undefined) {
                    (gamepad as any).vibrationActuator.playEffect((gamepad as any).vibrationActuator.type, rumbleData)
                }
                repeatCount--
            }, delayMs + durationMs)
        }
    }

    static mapStateLabels(buttons, axes) {
        return {
            A: buttons[0]?.value || 0,
            B: buttons[1]?.value || 0,
            X: buttons[2]?.value || 0,
            Y: buttons[3]?.value || 0,
            LeftShoulder: buttons[4]?.value || 0,
            RightShoulder: buttons[5]?.value || 0,
            LeftTrigger: buttons[6]?.value || 0,
            RightTrigger: buttons[7]?.value || 0,
            View: buttons[8]?.value || 0,
            Menu: buttons[9]?.value || 0,
            LeftThumb: buttons[10]?.value || 0,
            RightThumb: buttons[11]?.value || 0,
            DPadUp: buttons[12]?.value || 0,
            DPadDown: buttons[13]?.value || 0,
            DPadLeft: buttons[14]?.value || 0,
            DPadRight: buttons[15]?.value || 0,
            Nexus: buttons[16]?.value || (buttons[8]?.value && buttons[9]?.value) || 0,
            LeftThumbXAxis: axes[0],
            LeftThumbYAxis: axes[1],
            RightThumbXAxis: axes[2],
            RightThumbYAxis: axes[3],
        } as InputFrame
    }
}