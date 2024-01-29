export const mockRTCPeerConnection = () => {
    // Mock RTCPeerConnection
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
        },
    } as RTCPeerConnection));

    jest.spyOn(global.console, 'log').mockImplementation(() => jest.fn());
}

describe('TestHelper', () => {
    it('should be able to mock RTCPeerConnection', () => {
        mockRTCPeerConnection()
        expect(global.RTCPeerConnection).toBeDefined()
    })
})