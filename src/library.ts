import xCloudPlayer, { xCloudPlayerConfig, PlayerChannels } from './player'
import xCloudApiClient, {
    xCloudApiClientConfig,
    StartStreamReponse,
    ConsolesResponse,
    Console,
    ApiStatusResponse,
} from './apiclient'
import Gamepad, {
    GamepadOptions,
    GamepadOptionsDefaults,
    GamepadAxisName,
    GamepadButtonName,
    GamepadFrameKey,
} from './input/gamepad'
import MouseKeyboard from './input/mousekeyboard'
import Touch from './input/touch'
import Stream, {
    StreamState,
    StateResponse,
    SdpExchangeResponse,
    IceExchangeResponse,
    IceCandidatePayload,
    KeepaliveResponse,
    StopStreamResponse,
} from './lib/stream'
import Stats, { InboundRtpStats, CandidatePairStats, RemoteCandidateStats } from './lib/stats'
import Sdp from './lib/sdp'
import Ice from './lib/ice'
import Teredo from './lib/teredo'
import Channel, { ChannelSendData } from './lib/channel'
import ChatChannel from './channel/chat'
import ControlChannel, { GamepadSlotIndex, InputHandler, GamepadHandlers } from './channel/control'
import InputChannel, { VibrationFrame } from './channel/input'
import MessageChannel from './channel/message'
import DebugChannel from './channel/debug'
import InputPacket, {
    InputFrame,
    PointerEventTarget,
    PointerEventData,
    PointerFrame,
    MouseFrame,
    KeyboardFrame,
    MetadataFrame,
    StreamConfig,
    ReportTypes,
} from './channel/input/packet'
import InputQueue from './channel/input/queue'
import { ChannelMessage, DialogMessageContent } from './channel/message/handler'
import { OverlayStyle } from './render/overlay'

export interface xCloudPlayerLibrary {
    Player: typeof xCloudPlayer;
    ApiClient: typeof xCloudApiClient;
    Gamepad: typeof Gamepad;
    MouseKeyboard: typeof MouseKeyboard;
    Touch: typeof Touch;
}

export {
    xCloudPlayer,
    xCloudApiClient,
    Gamepad,
    MouseKeyboard,
    Touch,
    Stream,
    Stats,
    Sdp,
    Ice,
    Teredo,
    Channel,
    ChatChannel,
    ControlChannel,
    InputChannel,
    MessageChannel,
    DebugChannel,
    InputPacket,
    InputQueue,
    ReportTypes,
}

export type StartStreamResponse = StartStreamReponse
export type xCloudApiClientConfigRequired = Required<xCloudApiClientConfig>
export type RequestHeaders = Record<string, string>
export type StreamType = 'home' | 'cloud'

export type {
    xCloudPlayerConfig,
    PlayerChannels,
    xCloudApiClientConfig,
    StartStreamReponse,
    ConsolesResponse,
    Console,
    ApiStatusResponse,
    GamepadOptions,
    GamepadOptionsDefaults,
    GamepadAxisName,
    GamepadButtonName,
    GamepadFrameKey,
    StreamState,
    StateResponse,
    SdpExchangeResponse,
    IceExchangeResponse,
    IceCandidatePayload,
    KeepaliveResponse,
    StopStreamResponse,
    InboundRtpStats,
    CandidatePairStats,
    RemoteCandidateStats,
    ChannelSendData,
    GamepadSlotIndex,
    InputHandler,
    GamepadHandlers,
    VibrationFrame,
    InputFrame,
    PointerEventTarget,
    PointerEventData,
    PointerFrame,
    MouseFrame,
    KeyboardFrame,
    MetadataFrame,
    StreamConfig,
    ChannelMessage,
    DialogMessageContent,
    OverlayStyle,
}

const library: xCloudPlayerLibrary = {
    Player: xCloudPlayer,
    ApiClient: xCloudApiClient,
    Gamepad: Gamepad,
    MouseKeyboard: MouseKeyboard,
    Touch: Touch,
}

export default library