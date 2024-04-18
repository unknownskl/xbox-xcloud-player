// import ApiClient from '../dist/apiclient'
import ApiClient from '../src/apiclient'

describe('ApiClient', () => {
    it('should be defined', () => {
        expect(typeof ApiClient).toBe("function");
    })

    it('should have the default values set', () => {
        const apiClient = new ApiClient()
        expect(apiClient.getConfig()).toStrictEqual({ locale: 'en-US', host: '', token: '' })
        expect(apiClient.getBaseHost()).toBe('')
    })

    it('should set the config correctly', () => {
        const apiClient = new ApiClient({ locale: 'xx-XX', host: 'res1', token: 'res2' })
        expect(apiClient.getConfig()).toStrictEqual({ locale: 'xx-XX', host: 'res1', token: 'res2' })
        expect(apiClient.getBaseHost()).toBe('res1')
    })

    it('getConsoles()', () => {
        const apiClient = new ApiClient()
        apiClient.get = jest.fn(() => Promise.resolve({
            "totalItems": 1,
            "results": [
                {
                    "deviceName": "ConsoleName",
                    "serverId": "F000000000000000",
                    "powerState": "ConnectedStandby",
                    "consoleType": "XboxSeriesX",
                    "playPath": "v5/sessions/home/play",
                    "outOfHomeWarning": false,
                    "wirelessWarning": false,
                    "isDevKit": false
                }
            ],
            "continuationToken": null
        }))

        apiClient.getConsoles().then((data) => {
            expect(data.totalItems).toBe(1)
            expect(data.results.length).toBe(1)
            expect(data.results[0].deviceName).toBe('ConsoleName')
            expect(data.results[0].serverId).toBe('F000000000000000')
            expect(data.results[0].powerState).toBe('ConnectedStandby')
            expect(data.results[0].consoleType).toBe('XboxSeriesX')
            expect(data.results[0].playPath).toBe('v5/sessions/home/play')

        }).catch((error) => {
            console.log('error', error)
            expect(error).toBeUndefined()
        })
    })

    it('startStream()', () => {
        const apiClient = new ApiClient()
        apiClient.post = jest.fn(() => Promise.resolve({
            sessionId: '00000000-0000-0000-0000-000000000000',
            sessionPath: 'v5/sessions/home/00000000-0000-0000-0000-000000000000',
            state: 'Provisioning'
          }))

        apiClient.startStream('home', 'F000000000000000').then((stream) => {
            expect(stream.getSessionId()).toBe('00000000-0000-0000-0000-000000000000')
            expect(stream.getState()).toBe('New')
            expect(stream.getSessionPath()).toBe('/v5/sessions/home/00000000-0000-0000-0000-000000000000')
            
        }).catch((error) => {
            console.log('error', error)
            expect(error).toBeUndefined()
        })
    })
})