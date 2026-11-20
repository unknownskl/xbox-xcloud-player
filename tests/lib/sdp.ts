import Sdp from '../../src/lib/sdp'
import xCloudPlayer from '../../src/player'
import { mockRTCPeerConnection } from '../testhelper'

describe('SDP', () => {
    beforeEach(() => {
        mockRTCPeerConnection()
    })

    it('should be defined', () => {
        expect(typeof Sdp).toBe("function");
    })

    it('should be able to create a new Sdp class with default values', () => {
        const player = new xCloudPlayer('test')
        const sdpHelper = new Sdp(player)

        expect(sdpHelper).toBeInstanceOf(Sdp)
        player.destroy()
    })

    it('should get a list of available codecs', () => {
        const player = new xCloudPlayer('test')
        const sdpHelper = new Sdp(player);
        const codecs = sdpHelper.getAvailableCodecs()

        expect(codecs).toEqual(expect.arrayContaining(['video/VP8', 'video/VP9', 'video/H264', 'video/AV1']));
        player.destroy()
    })

    it('should handle _setBitrate when media section ends at EOF', () => {
        const player = new xCloudPlayer('test')
        const sdpHelper = new Sdp(player)
        const sdp = 'v=0\nm=video 9 UDP/TLS/RTP/SAVPF 96\nc=IN IP4 0.0.0.0'

        const updated = sdpHelper._setBitrate(sdp, 'video', 5000)
        expect(updated).toContain('b=AS:5000')
        player.destroy()
    })

})