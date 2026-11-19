import xCloudPlayer, { xCloudPlayerConfig, InputFrame, xCloudPlayerLibrary } from '../src/library'
import Player from '../src/player'
require('./testhelper')

describe('Player', () => {
    it('should be defined', () => {
        expect(typeof Player).toBe("function");
    })

    it('should be start normally with default values', () => {
        const player = new Player('videoHolder')

        expect(typeof player._peerConnection).toBe("object");

        expect(typeof player._channels.chat).toBe("object");
        expect(typeof player._channels.control).toBe("object");
        expect(typeof player._channels.input).toBe("object");
        expect(typeof player._channels.message).toBe("object");

        player.destroy()
    })

    it('should throw an error when destroy is called twice', () => {
        const player = new Player('videoHolder')

        player.destroy()
        try {
            player.destroy()
            expect(true).toBe(false)
        } catch(e){
            expect(e).toBeInstanceOf(Error)
        }
    })

    it('should expose typed player config, channels, and gamepad frames', () => {
        const lib: xCloudPlayerLibrary = xCloudPlayer
        const config: xCloudPlayerConfig = {
            audio_mono: true,
            audio_bitrate: 64,
            video_bitrate: 4000,
            keyframe_interval: 5,
        }
        const player = new lib.Player('videoHolder', config)
        const gamepad = new lib.Gamepad(0, { enable_gamepad: false, enable_keyboard: false })
        const defaultFrame: InputFrame = gamepad.getDefaultFamepadFrame()

        expect(player.getElementId()).toBe('videoHolder')
        expect(defaultFrame.GamepadIndex).toBe(0)
        expect(player.getIceCandidates()).toEqual([])

        const originalGetGamepads = (global.navigator as any).getGamepads;
        (global.navigator as any).getGamepads = () => []
        try {
            gamepad.attach(player)
            gamepad.sendButtonState('toString', 1)
            expect(gamepad.hasOverrideButtons()).toBe(false)
            gamepad.detach()
        } finally {
            (global.navigator as any).getGamepads = originalGetGamepads
        }

        player.destroy()
    })
})