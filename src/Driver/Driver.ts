import xCloudPlayer from '../Library'
import { InputFrame } from '../Channel/Input'

export default interface Driver { 
    setApplication(application: xCloudPlayer): void; 
    start(): void;
    stop(): void;

    pressButton(index: number, button: string): void;

    requestStates(): Array<InputFrame>;
    mapStateLabels(buttons: Array<boolean>, axes:Array<any>): InputFrame;
} 