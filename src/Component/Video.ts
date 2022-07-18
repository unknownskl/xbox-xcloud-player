import xCloudPlayer from '../Library'

export default class VideoComponent {

    _client:xCloudPlayer

    _videoSource
    _mediaSource
    _videoRender

    _focusEvent
    _framekeyInterval

    constructor(client:xCloudPlayer) {
        this._client = client
    }

    create() {
        console.log('xCloudPlayer Component/Video.ts - Create media element')

        const videoHolder = document.getElementById(this._client._elementHolder)
        if(videoHolder !== null){
            const videoSrc = this.createMediaSource()
            const videoRender = document.createElement('video')
            videoRender.id = this.getElementId()
            videoRender.src = videoSrc
            videoRender.width = videoHolder.clientWidth
            videoRender.height = videoHolder.clientHeight
            this._videoRender = videoRender
            
            videoHolder.appendChild(videoRender)
            
            videoRender.play().then(() => {
                //
            }).catch((error) => {
                console.log('xCloudPlayer Component/Video.ts - Error executing play() on videoRender:', error)
            })

            // this._focusEvent = () => {
            //     this._client.getChannelProcessor('video').resetBuffer()
            // }
            // window.addEventListener('focus', this._focusEvent)

            this._framekeyInterval = setInterval(() => {
                // this.resetMediaSource()
                this._client.getChannelProcessor('video').resetBuffer()
            }, 15000)
        } else {
            console.log('xCloudPlayer Component/Video.ts - Error fetching videoholder: div#'+this._client._elementHolder)
        }

        console.log('xCloudPlayer Component/Video.ts - Media element created')
    }

    getElementId(){
        return 'xCloudPlayer_'+this._client._elementHolderRandom+'_videoRender'
    }

    getSource() {
        return this._videoSource
    }

    createMediaSource() {
        const mediaSource = new MediaSource() // @TODO: MediaSource (MSE) is not available on iOS. 
        const videoSourceUrl = window.URL.createObjectURL(mediaSource)

        mediaSource.addEventListener('sourceopen', () => {
            console.log('xCloudPlayer Component/Video.ts - MediaSource opened. Attaching videoSourceBuffer...')
        
            const videoSourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42c020"')
            videoSourceBuffer.mode = 'sequence'

            // videoSourceBuffer.addEventListener('updateend', (event) => {
            //     // console.log('xCloudPlayer Component/Video.ts - Updateend video...', event);
            // })

            // videoSourceBuffer.addEventListener('update', (event) => {
            //     // console.log('xCloudPlayer Component/Video.ts - Updateend video...', event);
            // })

            videoSourceBuffer.addEventListener('error', (event) => {
                console.log('xCloudPlayer Component/Video.ts - Error video...', event)
            })

            this._videoSource = videoSourceBuffer
        })

        this._mediaSource = mediaSource

        return videoSourceUrl
    }

    resetMediaSource() {
        // this.destroy()
        // this.create()



        // const videoSrc = this.createMediaSource()
        // const videoRender = document.getElementById(this.getElementId()) as HTMLVideoElement | null
        // if(videoRender !== null){
        //     videoRender.src = videoSrc
        // }



        // this._mediaSource.removeSourceBuffer(this._mediaSource.sourceBuffers[0])

        // const videoSourceBuffer = this._mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42c020"')
        // videoSourceBuffer.mode = 'sequence'
        // videoSourceBuffer.addEventListener('error', (event) => {
        //     console.log('xCloudPlayer Component/Video.ts - Error video...', event)
        // })
        // this._videoSource = videoSourceBuffer

        // const videoRender = document.getElementById(this.getElementId()) as HTMLVideoElement | null
        // if(videoRender !== null){
        //     videoRender.src = window.URL.createObjectURL(this._mediaSource)
        // }



        this._mediaSource.sourceBuffers[0].abort()

    }

    destroy() {
        // this._videoRender.pause()

        // window.removeEventListener('focus', this._focusEvent)
        clearInterval(this._framekeyInterval)

        delete this._mediaSource
        delete this._videoRender
        delete this._videoSource
        
        document.getElementById(this.getElementId())?.remove()

        console.log('xCloudPlayer Component/Video.ts - Cleaning up Video element')
    }
}