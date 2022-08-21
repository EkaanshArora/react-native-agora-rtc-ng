import { NativeModules } from 'react-native';

const { ReactNativeAgoraRtcNg } = NativeModules;
export const showRPSystemBroadcastPickerView: Function =
  ReactNativeAgoraRtcNg.showRPSystemBroadcastPickerView;

import { IRtcEngine } from './IAgoraRtcEngine';
import { RtcEngineInternal } from './internal/RtcEngineInternal';
import { IMediaPlayerCacheManager } from './IAgoraMediaPlayer';
import { IMediaPlayerCacheManagerImpl } from './impl/IAgoraMediaPlayerImpl';

export * from './AgoraBase';
export * from './AgoraMediaBase';
export * from './AgoraMediaPlayerTypes';
export * from './IAgoraLog';
export * from './IAgoraMediaEngine';
export * from './IAgoraMediaPlayer';
export * from './IAgoraMediaPlayerSource';
export * from './IAgoraMediaRecorder';
export * from './IAgoraRhythmPlayer';
export * from './IAgoraRtcEngine';
export * from './IAgoraRtcEngineEx';
export * from './IAgoraSpatialAudio';
export * from './IAudioDeviceManager';
export * from './AgoraRtcRenderView';
/**
 * @internal
 */
export {
  isDebuggable,
  setDebuggable,
  callIrisApi,
} from './internal/IrisApiEngine';

const instance = new RtcEngineInternal();

/**
 * Creates the IRtcEngine object.
 * Currently, the Agora RTC SDK v4.0.0 supports creating only one IRtcEngine object for an app.
 *
 * @returns
 * IRtcEngine object.
 */
export function createAgoraRtcEngine(): IRtcEngine {
  return instance;
}

export function getMediaPlayerCacheManager(): IMediaPlayerCacheManager {
  return new IMediaPlayerCacheManagerImpl();
}

export default createAgoraRtcEngine;
