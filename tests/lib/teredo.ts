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

    it('should pad unpadded hextets and distinguish Teredo from non-Teredo 2001:: addresses', () => {
        expect(Teredo.isTeredoAddress('2001::ce49:7601:e866:efff:62c3:fffe')).toBe(true)
        expect(Teredo.isTeredoAddress('2001:4860:4860::8888')).toBe(false)

        const unpadded = new Teredo('2001:0:4136:e378:8000:fff:3faf:fffe')
        expect(unpadded.getIpv4Address()).toBe('192.80.0.1')
        expect(unpadded.getIpv4Port()).toBe(61440)
    })

    it('should fallback safely on malformed IPv6 addresses', () => {
        const malformed = new Teredo('not-an-ipv6')
        expect(malformed.getIpv4Address()).toBe('0.0.0.0')
        expect(malformed.getIpv4Port()).toBe(0)
    })
})