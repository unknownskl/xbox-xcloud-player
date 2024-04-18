import xCloudApiClient from "../../src/apiclient";
import Stream from "../../src/lib/stream"

describe('Stream', () => {
    it('should be defined', () => {
        expect(typeof Stream).toBe("function");
    })

    it('should be able to create a new Stream with default values', () => {
        const apiClient = new xCloudApiClient()
        const stream = new Stream(apiClient, {
            sessionId: '00000000-0000-0000-0000-000000000000',
            sessionPath: 'v5/sessions/home/00000000-0000-0000-0000-000000000000',
            state: 'Provisioning'
        })

        expect(stream.getSessionId()).toBe('00000000-0000-0000-0000-000000000000')
        expect(stream.getSessionPath()).toBe('/v5/sessions/home/00000000-0000-0000-0000-000000000000')
        expect(stream.getState()).toBe('New')
    })

    it('should be able to refresh the status and reflect the new status', (done) => {
        const apiClient = new xCloudApiClient()
        const stream = new Stream(apiClient, {
            sessionId: '00000000-0000-0000-0000-000000000000',
            sessionPath: 'v5/sessions/home/00000000-0000-0000-0000-000000000000',
            state: 'Provisioning'
        })
        expect(stream.getState()).toBe('New')

        apiClient.get = jest.fn(() => Promise.resolve({ state: 'ReadyToConnect', errorDetails: null }))
        stream.refreshState().then((state) => {
            expect(stream.getState()).toBe('ReadyToConnect')
            done()

        }).catch((error) => {
            expect(error).toBeUndefined()
        })
    })

    it('should fire the callback onReadyToConnect', (done) => {
        const apiClient = new xCloudApiClient()
        const stream = new Stream(apiClient, {
            sessionId: '00000000-0000-0000-0000-000000000000',
            sessionPath: 'v5/sessions/home/00000000-0000-0000-0000-000000000000',
            state: 'Provisioning'
        })
        expect(stream.getState()).toBe('New')

        stream.onReadyToConnect = (stream2) => {
            expect(stream2.getState()).toBe('ReadyToConnect')
            done()

            return stream2
        }
        apiClient.get = jest.fn(() => Promise.resolve({ state: 'ReadyToConnect', errorDetails: null }))
        stream.refreshState().then((state) => {
            expect(stream.getState()).toBe('ReadyToConnect')

        }).catch((error) => {
            expect(error).toBeUndefined()
        })
    })
})