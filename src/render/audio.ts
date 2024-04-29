import xCloudPlayer from '../player'

export default class AudioComponent {
    private _player:xCloudPlayer

    constructor(player:any){
        this._player = player
    }

    create(stream:MediaStream) {
        const audioElement = document.createElement('audio')
        audioElement.srcObject = stream
        audioElement.autoplay = true
        audioElement.muted = false

        const element = document.getElementById(this._player.getElementId())
        if(element === null) {return}

        element.appendChild(audioElement)
    }

    destroy(){
        const streamHolder = document.getElementById(this._player.getElementId())
        const element = streamHolder?.querySelector('audio')

        if(element){
            element.remove()
        }
    }
}