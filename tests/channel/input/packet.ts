import InputPacket from '../../../src/channel/input/packet'

describe('InputPacket', () => {
    it('should serialize pointer queues with multiple frames without size mismatch or mutating input', () => {
        const packet = new InputPacket(1)
        packet.setStreamConfig({ width: 1920, height: 1080 })

        const mockTarget = {
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1920, height: 1080 }),
        }
        const pointerFrames = [
            {
                events: [
                    { target: mockTarget, type: 'pointerdown', pressure: 0.5, twist: 0, x: 100, y: 200 },
                ],
            },
            {
                events: [
                    { target: mockTarget, type: 'pointermove', pressure: 0.5, twist: 0, x: 150, y: 250 },
                ],
            },
        ]

        packet.setData([], [], pointerFrames, [], [])

        const firstBuffer = packet.toBuffer()
        const secondBuffer = packet.toBuffer()

        expect(firstBuffer.byteLength).toBe(packet._totalSize)
        expect(secondBuffer.byteLength).toBe(packet._totalSize)
        expect(pointerFrames[0].events.length).toBe(1)
        expect(pointerFrames[1].events.length).toBe(1)
    })

    it('should cap queues at 255 items so uint8 lengths do not wrap', () => {
        const packet = new InputPacket(2)
        const keyboardFrames = Array.from({ length: 260 }, () => ({
            pressed: true,
            keyCode: 65,
            key: 'a',
        }))

        packet.setData([], [], [], [], keyboardFrames)

        const buffer = packet.toBuffer()
        expect(buffer.byteLength).toBe(14 + 1 + (255 * 3))
        expect(buffer.getUint8(14)).toBe(255)
        expect(keyboardFrames.length).toBe(260)
    })
})
