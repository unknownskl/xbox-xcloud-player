import xCloudPlayer from './player'
import xCloudApiClient from './apiclient'
import Gamepad from './input/gamepad'
import MouseKeyboard from './input/mousekeyboard'
import Touch from './input/touch'

export default {
    Player: xCloudPlayer,
    ApiClient: xCloudApiClient,
    Gamepad: Gamepad,
    MouseKeyboard: MouseKeyboard,
    Touch: Touch,
}