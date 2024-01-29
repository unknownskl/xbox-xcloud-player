import GamepadDriver from '../src/Driver/Gamepad'
import xCloudPlayer from '../src/Library'
import { mockRTCPeerConnection } from './TestHelper';

mockRTCPeerConnection();

describe('GamepadDriver', () => {
    it('should load without errors', () => {
        const player = new xCloudPlayer('MockId', {})
        const driver = new GamepadDriver()

        driver.setApplication(player)
        expect(driver).toBeInstanceOf(GamepadDriver)
        expect(driver._application).toBeInstanceOf(xCloudPlayer)
    })

    it('should queue gamepad states when pressing a button', (done) => {
        const player = new xCloudPlayer('MockId', {})
        const driver = new GamepadDriver()

        driver.setApplication(player)
        driver.pressButton(0, 'Nexus')

        expect(player.getChannelProcessor('input')._gamepadFrames).toHaveLength(1)
        expect(player.getChannelProcessor('input')._gamepadFrames[0].Nexus).toBe(1)

        setTimeout(() => {
            // console.info(player.getChannelProcessor('input')._gamepadFrames)
            expect(player.getChannelProcessor('input')._gamepadFrames).toHaveLength(2)
            expect(player.getChannelProcessor('input')._gamepadFrames[1].Nexus).toBe(0)

            done()
        }, 100)
    })
})