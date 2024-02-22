import xCloudPlayer from '../src/Library'
import { mockRTCPeerConnection } from './TestHelper';

mockRTCPeerConnection();

describe('Library', () => {
    it('should load without errors', () => {

        const logSpy = jest.spyOn(console, 'log');
        // jest.spyOn(global.console, 'log').mockImplementation(() => jest.fn());
        const instance = new xCloudPlayer('MockId', {});
        instance.bind()

        expect((global as any).RTCPeerConnection).toBeCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('xCloudPlayer loaded!');
    });

    it('initial states should be set correctly', () => {

        const instance = new xCloudPlayer('MockId', {});
        instance.bind()

        // console.warn(instance)

        expect(instance._isResetting).toBe(false);
        expect(instance._webrtcStates.iceCandidates.length).toBe(0);
        expect(instance._webrtcStates.iceGathering).toBe('open');
        expect(instance._webrtcStates.iceConnection).toBe('open');
        expect(instance._webrtcStates.streamConnection).toBe('open');
    });
});