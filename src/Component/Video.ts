import xCloudPlayer from '../Library'
import FpsCounter from '../Helper/FpsCounter'

export default class VideoComponent {

    _client:xCloudPlayer

    _videoSource
    _mediaSource
    _videoRender

    _focusEvent
    _framekeyInterval

    _videoFps

    constructor(client:xCloudPlayer) {
        this._client = client
    }

    create(srcObject) {
        console.log('xCloudPlayer Component/Video.ts - Create media element')

        this._videoFps = new FpsCounter(this._client, 'video')

        const videoHolder = document.getElementById(this._client._elementHolder)
        if(videoHolder !== null){
            const videoRender = document.createElement('video')
            videoRender.id = this.getElementId()
            videoRender.srcObject = srcObject
            videoRender.width = videoHolder.clientWidth
            videoRender.height = videoHolder.clientHeight
            videoRender.style.touchAction = 'none'

            // videoRender.muted = true
            videoRender.autoplay = true
            videoRender.setAttribute('playsinline', 'playsinline')
            // videoHolder.style.aspectRatio = '16 / 9'

            videoRender.onclick = () => {
                videoRender.play()
                this._client._audioComponent._audioRender.play()
            }

            const serverDataLoop = (t, i) => {
                videoRender.requestVideoFrameCallback(serverDataLoop)
                this._videoFps.count()

                this._client.getChannelProcessor('input').addProcessedFrame({
                    serverDataKey: i.rtpTimestamp,
                    firstFramePacketArrivalTimeMs: i.receiveTime,
                    frameSubmittedTimeMs: i.receiveTime,
                    frameDecodedTimeMs: i.expectedDisplayTime,
                    frameRenderedTimeMs: i.expectedDisplayTime,
                })
            }
            videoRender.requestVideoFrameCallback(serverDataLoop)
            this._videoRender = videoRender
            
            videoHolder.appendChild(videoRender)
            this._videoFps.start()

            // Pointer / Mouse events
            videoRender.addEventListener('pointermove', (e) => this._client.getChannelProcessor('input').onPointerMove(e), { passive: false }),
            videoRender.addEventListener('pointerdown', (e) => this._client.getChannelProcessor('input').onPointerClick(e), { passive: false }),
            videoRender.addEventListener('pointerup', (e) => this._client.getChannelProcessor('input').onPointerClick(e), { passive: false }),
            videoRender.addEventListener('wheel', (e) => this._client.getChannelProcessor('input').onPointerScroll(e), { passive: false })

            // Keyboard events
            window.addEventListener('keydown', (e) => { this._client.getChannelProcessor('input').onKeyDown(e) }) 
            window.addEventListener('keyup', (e) => { this._client.getChannelProcessor('input').onKeyUp(e) })

            // videoHolder.addEventListener("touchmove", (e) => this._client.getChannelProcessor('input').onPointerMove(e)),
            // videoHolder.addEventListener("touchstart", (e) => this._client.getChannelProcessor('input').onPointerClick(e)),
            // videoHolder.addEventListener("touchend", (e) => this._client.getChannelProcessor('input').onPointerClick(e)),
            
            videoRender.play().then(() => {
                //
            }).catch((error) => {
                console.log('xCloudPlayer Component/Video.ts - Error executing play() on videoRender:', error)
            })
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

            videoSourceBuffer.addEventListener('error', (event) => {
                console.log('xCloudPlayer Component/Video.ts - Error video...', event)
            })

            this._videoSource = videoSourceBuffer
        })

        this._mediaSource = mediaSource

        return videoSourceUrl
    }

    destroy() {
        this._videoFps.stop()

        delete this._mediaSource
        delete this._videoRender
        delete this._videoSource
        
        document.getElementById(this.getElementId())?.remove()

        console.log('xCloudPlayer Component/Video.ts - Cleaning up Video element')
    }
}