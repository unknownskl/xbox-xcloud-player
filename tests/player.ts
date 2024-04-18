import Player from '../src/player'
require('./testhelper')

describe('Player', () => {
    it('should be defined', () => {
        expect(typeof Player).toBe("function");
    })

    it('should be start normally with default values', () => {
        const player = new Player('videoHolder')

        expect(typeof player._peerConnection).toBe("object");

        expect(typeof player._channels.chat).toBe("object");
        expect(typeof player._channels.control).toBe("object");
        expect(typeof player._channels.input).toBe("object");
        expect(typeof player._channels.message).toBe("object");

        player.destroy()
    })

    it('should throw an error when destroy is called twice', () => {
        const player = new Player('videoHolder')

        player.destroy()
        try {
            player.destroy()
            expect(true).toBe(false)
        } catch(e){
            expect(e).toBeInstanceOf(Error)
        }
    })
})