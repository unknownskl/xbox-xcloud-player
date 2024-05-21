export const mockRTCPeerConnection = () => {
    // Mock RTCPeerConnection
    (global as any).RTCRtpTransceiver = jest.fn(cb => ({
        setCodecPreferences: () => {
            // console.log('peerConnection.close');
        }
    } as any));

    (global as any).navigator = {
        permissions: {
            query: () => {
                return {
                    then: (cb) => {
                        cb({state: 'granted'})
                    }
                }
            }
        }
    };

    (global as any).RTCRtpReceiver = {
    // (global as any).RTCRtpReceiver = jest.fn(() => ({
        getCapabilities: () => {
            return {
                codecs: [
                    {
                        "clockRate": 90000,
                        "mimeType": "video/VP8"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/rtx"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/VP9",
                        "sdpFmtpLine": "profile-id=0"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/VP9",
                        "sdpFmtpLine": "profile-id=2"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/VP9",
                        "sdpFmtpLine": "profile-id=1"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/VP9",
                        "sdpFmtpLine": "profile-id=3"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=f4001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=f4001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/AV1"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/AV1",
                        "sdpFmtpLine": "profile=1"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/H264",
                        "sdpFmtpLine": "level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=64001f"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/red"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/ulpfec"
                    },
                    {
                        "clockRate": 90000,
                        "mimeType": "video/flexfec-03",
                        "sdpFmtpLine": "repair-window=10000000"
                    }
                ],
                headerExtensions: [],
            }
        }
    } as any;

    (global as any).RTCPeerConnection = jest.fn(cb => ({
        createDataChannel: (label) => {
            return {
                addEventListener: (type, listener) => {
                    // console.log('dataChannel.addEventListener: ', type);
                }
            }
        },
        addEventListener: (type, listener) => {
            // console.log('peerConnection.addEventListener: ', type);
        },
        addTransceiver: (type, listener) => {
            // console.log('peerConnection.addTransceiver: ', type);
            return {
                setCodecPreferences: (codecs) => {
                    // console.log('peerConnection.close');
                }
            }
        },
        getTransceivers() {
            return [
                // new global.RTCRtpTransceiver(),
                // new global.RTCRtpTransceiver(),
            ] as any
        },
        close: () => {
            // console.log('peerConnection.close');
        }
    } as RTCPeerConnection));

    // jest.spyOn(global.console, 'log').mockImplementation(() => jest.fn());
}

describe('TestHelper', () => {
    it('should be able to mock RTCPeerConnection', () => {
        mockRTCPeerConnection()
        expect(global.RTCPeerConnection).toBeDefined()
    })

    it('should be able to mock RTCRtpTransceiver', () => {
        mockRTCPeerConnection()
        expect(global.RTCRtpTransceiver).toBeDefined()
    })

    it('should be able to mock RTCRtpReceiver', () => {
        mockRTCPeerConnection()
        expect(global.RTCRtpReceiver).toBeDefined()
    })
})