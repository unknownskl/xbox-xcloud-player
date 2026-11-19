import Player from '../src/player'
import AudioComponent from '../src/render/audio'
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

    describe('volume control', () => {

        it('should have default volume 1 and unmuted state', () => {
            const player = new Player('videoHolder')

            expect(player.getVolume()).toBe(1)
            expect(player.isMuted()).toBe(false)

            player.destroy()
        })

        it('should initialize volume and mute state from config and clamp out-of-range values', () => {
            const player = new Player('videoHolder', {
                audio_volume: 0.35,
                audio_muted: true,
            })

            expect(player.getVolume()).toBe(0.35)
            expect(player.isMuted()).toBe(true)
            player.destroy()

            const lowPlayer = new Player('videoHolder', { audio_volume: -0.5 })
            expect(lowPlayer.getVolume()).toBe(0)
            lowPlayer.destroy()

            const highPlayer = new Player('videoHolder', { audio_volume: 1.8 })
            expect(highPlayer.getVolume()).toBe(1)
            highPlayer.destroy()

            const nanPlayer = new Player('videoHolder', { audio_volume: Number.NaN })
            expect(nanPlayer.getVolume()).toBe(1)
            nanPlayer.destroy()
        })

        it('should update and clamp volume and ignore NaN', () => {
            const player = new Player('videoHolder')

            player.setVolume(0.45)
            expect(player.getVolume()).toBe(0.45)

            player.setVolume(-1)
            expect(player.getVolume()).toBe(0)

            player.setVolume(2.5)
            expect(player.getVolume()).toBe(1)

            player.setVolume(0.6)
            player.setVolume(Number.NaN)
            expect(player.getVolume()).toBe(0.6)

            player.destroy()
        })

        it('should update mute state via mute, unmute, setMuted, and toggleMute', () => {
            const player = new Player('videoHolder')

            player.mute()
            expect(player.isMuted()).toBe(true)

            player.unmute()
            expect(player.isMuted()).toBe(false)

            player.setMuted(true)
            expect(player.isMuted()).toBe(true)

            expect(player.toggleMute()).toBe(false)
            expect(player.isMuted()).toBe(false)

            expect(player.toggleMute()).toBe(true)
            expect(player.isMuted()).toBe(true)

            player.destroy()
        })

        it('should apply pre-ontrack and live volume and mute changes to the audio element and clean up on destroy', () => {
            const mockAudioElement: any = {
                srcObject: null,
                autoplay: false,
                muted: false,
                volume: 1,
                remove: jest.fn(),
            }
            const mockContainer = {
                appendChild: jest.fn(),
                querySelector: jest.fn(() => mockAudioElement),
            };
            (global as any).document = {
                createElement: jest.fn(() => mockAudioElement),
                getElementById: jest.fn(() => mockContainer),
            }

            const player = new Player('videoHolder', {
                audio_volume: 0.25,
                audio_muted: true,
            })

            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [{}],
            } as any)

            expect(player.getAudioElement()).toBe(mockAudioElement)
            expect(mockContainer.appendChild).toHaveBeenCalledWith(mockAudioElement)
            expect(mockAudioElement.volume).toBe(0.25)
            expect(mockAudioElement.muted).toBe(true)

            player.setVolume(0.8)
            expect(mockAudioElement.volume).toBe(0.8)
            expect(player.getVolume()).toBe(0.8)

            player.unmute()
            expect(mockAudioElement.muted).toBe(false)
            expect(player.isMuted()).toBe(false)

            expect(player.toggleMute()).toBe(true)
            expect(mockAudioElement.muted).toBe(true)
            expect(player.isMuted()).toBe(true)

            player.mute()
            expect(mockAudioElement.muted).toBe(true)

            player.destroy()
            expect(mockAudioElement.remove).toHaveBeenCalledTimes(1)
            expect(player.getAudioElement()).toBeUndefined()
        })

        it('should destroy previous audio element and preserve state when audio ontrack fires again', () => {
            const firstAudio: any = {
                srcObject: null,
                autoplay: false,
                muted: false,
                volume: 1,
                remove: jest.fn(),
            }
            const secondAudio: any = {
                srcObject: null,
                autoplay: false,
                muted: false,
                volume: 1,
                remove: jest.fn(),
            }
            const mockContainer = {
                appendChild: jest.fn(),
            };
            (global as any).document = {
                createElement: jest.fn()
                    .mockReturnValueOnce(firstAudio)
                    .mockReturnValueOnce(secondAudio),
                getElementById: jest.fn(() => mockContainer),
            }

            const player = new Player('videoHolder')

            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [{}],
            } as any)

            expect(player.getAudioElement()).toBe(firstAudio)
            firstAudio.volume = 0.65
            player.mute()

            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [{}],
            } as any)

            expect(firstAudio.srcObject).toBeNull()
            expect(firstAudio.remove).toHaveBeenCalledTimes(1)
            expect(player.getAudioElement()).toBe(secondAudio)
            expect(secondAudio.volume).toBe(0.65)
            expect(secondAudio.muted).toBe(true)

            player.destroy()
            expect(secondAudio.remove).toHaveBeenCalledTimes(1)
            expect(player.getAudioElement()).toBeUndefined()
        })

        it('should not create a detached audio element when container element is missing', () => {
            const createElementMock = jest.fn();
            (global as any).document = {
                createElement: createElementMock,
                getElementById: jest.fn(() => null),
            }

            const player = new Player('missingHolder')

            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [{}],
            } as any)

            expect(createElementMock).not.toHaveBeenCalled()
            expect(player.getAudioElement()).toBeUndefined()

            player.destroy()
        })

        it('should ignore empty ontrack streams without destroying existing audio element', () => {
            const mockAudioElement: any = {
                srcObject: null,
                autoplay: false,
                muted: false,
                volume: 1,
                remove: jest.fn(),
            }
            const mockContainer = {
                appendChild: jest.fn(),
            };
            (global as any).document = {
                createElement: jest.fn(() => mockAudioElement),
                getElementById: jest.fn(() => mockContainer),
            }

            const player = new Player('videoHolder')
            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [{}],
            } as any)

            expect(player.getAudioElement()).toBe(mockAudioElement)

            player._peerConnection.ontrack!({
                track: { kind: 'audio' },
                streams: [],
            } as any)

            expect(mockAudioElement.remove).not.toHaveBeenCalled()
            expect(player.getAudioElement()).toBe(mockAudioElement)

            player.destroy()
        })

        it('should ignore NaN in AudioComponent.setVolume', () => {
            const mockAudioElement: any = {
                srcObject: null,
                autoplay: false,
                muted: false,
                volume: 0.7,
                remove: jest.fn(),
            }
            const mockContainer = {
                appendChild: jest.fn(),
            };
            (global as any).document = {
                createElement: jest.fn(() => mockAudioElement),
                getElementById: jest.fn(() => mockContainer),
            }

            const player = new Player('videoHolder', { audio_volume: 0.7 })
            const audioComponent = new AudioComponent(player)
            audioComponent.create({} as any)
            expect(mockAudioElement.volume).toBe(0.7)

            audioComponent.setVolume(Number.NaN)
            expect(mockAudioElement.volume).toBe(0.7)

            audioComponent.destroy()
            player.destroy()
        })
    })
})