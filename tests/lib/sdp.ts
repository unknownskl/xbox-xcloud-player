import Sdp from '../../src/lib/sdp'
import xCloudPlayer from '../../src/player'

require('../testhelper')

describe('SDP', () => {
    it('should be defined', () => {
        expect(typeof Sdp).toBe("function");
    })

    it('should be able to create a new Sdp class with default values', () => {
        const sdpHelper = new Sdp(new xCloudPlayer('test'))

        console.log(sdpHelper)
    })

    it('should get a list of available codecs', () => {
        const sdpHelper = new Sdp(new xCloudPlayer('test'));
        const codecs = sdpHelper.getAvailableCodecs()
        console.log(sdpHelper, codecs)

        // expect(codecs).arrayContaining(['video/VP8', 'video/VP9', 'video/H264'])
        expect(codecs).toEqual(expect.arrayContaining(['video/VP8', 'video/VP9', 'video/H264', 'video/AV1']));
    })

})