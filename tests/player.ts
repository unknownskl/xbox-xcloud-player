import Player from '../src/player'
import { mockRTCPeerConnection } from './testhelper'

describe('Player', () => {
    const originalDocument = (global as any).document
    const originalGetComputedStyle = (global as any).getComputedStyle

    beforeEach(() => {
        mockRTCPeerConnection()
    })

    afterEach(() => {
        if(originalDocument === undefined){
            delete (global as any).document
        } else {
            (global as any).document = originalDocument
        }
        if(originalGetComputedStyle === undefined){
            delete (global as any).getComputedStyle
        } else {
            (global as any).getComputedStyle = originalGetComputedStyle
        }
        jest.restoreAllMocks()
    })

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

    it('should not throw or close twice when destroy is called twice', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
        const player = new Player('videoHolder')

        player.destroy()
        expect(() => player.destroy()).not.toThrow()
        expect(logSpy).toHaveBeenCalledWith('Cannot destroy because the player is already destroyed.')
        expect(player._peerConnection.close).toHaveBeenCalledTimes(1)
    })

    it('should clear Stats polling interval on destroy', () => {
        jest.useFakeTimers()
        try {
            const player = new Player('videoHolder')
            expect(jest.getTimerCount()).toBeGreaterThan(0)

            player.destroy()
            expect(jest.getTimerCount()).toBe(0)
        } finally {
            jest.clearAllTimers()
            jest.useRealTimers()
        }
    })

    it('should clean up video element, frame callbacks, and not create detached elements when container is missing', () => {
        const cancelFrameMock = jest.fn()
        const mockVideoElement: any = {
            srcObject: null,
            autoplay: false,
            muted: false,
            playsInline: false,
            style: {},
            requestVideoFrameCallback: jest.fn(() => 42),
            cancelVideoFrameCallback: cancelFrameMock,
            remove: jest.fn(),
        }
        const mockContainer = {
            style: {},
            appendChild: jest.fn(),
            querySelector: jest.fn(() => null),
        }
        const createElementMock = jest.fn(() => mockVideoElement);
        (global as any).getComputedStyle = jest.fn(() => ({ position: 'relative' }));
        (global as any).document = {
            createElement: createElementMock,
            getElementById: jest.fn((id: string) => id === 'videoHolder' ? mockContainer : null),
        }

        const missingPlayer = new Player('missingHolder')
        missingPlayer._peerConnection.ontrack!({
            track: { kind: 'video' },
            streams: [{}],
        } as any)
        expect(createElementMock).not.toHaveBeenCalled()
        expect(missingPlayer.getVideoElement()).toBeUndefined()
        missingPlayer.destroy()

        const player = new Player('videoHolder')
        player._peerConnection.ontrack!({
            track: { kind: 'video' },
            streams: [{}],
        } as any)
        expect(player.getVideoElement()).toBe(mockVideoElement)

        player.destroy()
        expect(cancelFrameMock).toHaveBeenCalledWith(42)
        expect(mockVideoElement.srcObject).toBeNull()
        expect(mockVideoElement.remove).toHaveBeenCalledTimes(1)
        expect(player.getVideoElement()).toBeUndefined()
    })

    it('should stop in-flight getUserMedia tracks if player is destroyed before permission resolves', async () => {
        let resolveMedia!: (stream: any) => void
        const mediaPromise = new Promise((resolve) => {
            resolveMedia = resolve
        })
        const stopTrackMock = jest.fn()
        const mockStream = {
            getTracks: () => [{ stop: stopTrackMock }],
            getAudioTracks: () => [{ kind: 'audio', stop: stopTrackMock }],
        };
        (global as any).navigator.mediaDevices = {
            getUserMedia: jest.fn(() => mediaPromise),
        }

        const addTrackMock = jest.fn()
        const player = new Player('videoHolder');
        (player._peerConnection as any).addTrack = addTrackMock

        player._channels.chat.startMicrophone()
        player.destroy()

        resolveMedia(mockStream)
        await Promise.resolve()
        await Promise.resolve()

        expect(stopTrackMock).toHaveBeenCalledTimes(1)
        expect(addTrackMock).not.toHaveBeenCalled()
    })
})