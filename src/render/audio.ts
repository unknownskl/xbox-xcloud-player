export default class AudioComponent {
    private _player:any

    constructor(player:any){
        this._player = player
    }

    create(stream:MediaStream) {
        const audioElement = document.createElement('audio')
        audioElement.srcObject = stream
        audioElement.autoplay = true

        const element = document.getElementById(this._player._elementId)
        if(element === null) {return}

        element.appendChild(audioElement)
    }

    destroy(){
        const streamHolder = document.getElementById(this._player._elementId)
        const element = streamHolder?.querySelector('audio')

        if(element){
            element.remove()
        }
    }
}