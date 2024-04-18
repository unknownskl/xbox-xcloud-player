import Teredo from "../../src/lib/teredo"

describe('Stream', () => {
    it('should be defined', () => {
        expect(typeof Teredo).toBe("function");
    })

    it('should be able to create a new Teredo class with default values', () => {
        const teredo = new Teredo('2001::ce49:7601:e866:efff:62c3:fffe')

        expect(teredo.getIpv4Address()).toBe('157.60.0.1')
        expect(teredo.getIpv4Port()).toBe(4096)
    })
})