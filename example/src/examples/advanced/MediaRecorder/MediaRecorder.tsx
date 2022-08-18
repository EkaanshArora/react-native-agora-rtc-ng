import React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IMediaRecorderObserver,
  IRtcEngineEventHandler,
  MediaRecorderContainerFormat,
  MediaRecorderStreamType,
  RecorderErrorCode,
  RecorderInfo,
  RecorderState,
} from 'react-native-agora-rtc-ng';
import RNFS from 'react-native-fs';

import Config from '../../../config/agora.config.json';

import {
  BaseComponent,
  BaseVideoComponentState,
} from '../../../components/BaseComponent';
import {
  AgoraButton,
  AgoraDivider,
  AgoraDropdown,
  AgoraSlider,
  AgoraTextInput,
} from '../../../components/ui';
import { enumToItems } from '../../../utils';

interface State extends BaseVideoComponentState {
  storagePath: string;
  containerFormat: MediaRecorderContainerFormat;
  streamType: MediaRecorderStreamType;
  maxDurationMs: number;
  recorderInfoUpdateInterval: number;
  startRecoding: boolean;
}

export default class MediaRecorder
  extends BaseComponent<{}, State>
  implements IRtcEngineEventHandler, IMediaRecorderObserver
{
  protected createState(): State {
    return {
      appId: Config.appId,
      enableVideo: true,
      channelId: Config.channelId,
      token: Config.token,
      uid: Config.uid,
      joinChannelSuccess: false,
      remoteUsers: [],
      startPreview: false,
      storagePath: `${
        Platform.OS === 'android'
          ? RNFS.ExternalCachesDirectoryPath
          : RNFS.DocumentDirectoryPath
      }`,
      containerFormat: MediaRecorderContainerFormat.FormatMp4,
      streamType: MediaRecorderStreamType.StreamTypeBoth,
      maxDurationMs: 120000,
      recorderInfoUpdateInterval: 1000,
      startRecoding: false,
    };
  }

  /**
   * Step 1: initRtcEngine
   */
  protected async initRtcEngine() {
    const { appId } = this.state;
    if (!appId) {
      console.error(`appId is invalid`);
    }

    this.engine = createAgoraRtcEngine();
    this.engine.registerEventHandler(this);
    this.engine.initialize({
      appId,
      // Should use ChannelProfileLiveBroadcasting on most of cases
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    if (Platform.OS === 'android') {
      // Need granted the microphone and camera permission
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }

    // Need to enable video on this case
    // If you only call `enableAudio`, only relay the audio stream to the target channel
    this.engine.enableVideo();

    // Start preview before joinChannel
    this.engine.startPreview();
    this.setState({ startPreview: true });
  }

  /**
   * Step 2: joinChannel
   */
  protected joinChannel() {
    const { channelId, token, uid } = this.state;
    if (!channelId) {
      console.error('channelId is invalid');
      return;
    }
    if (uid < 0) {
      console.error('uid is invalid');
      return;
    }

    // start joining channel
    // 1. Users can only see each other after they join the
    // same channel successfully using the same app id.
    // 2. If app certificate is turned on at dashboard, token is needed
    // when joining channel. The channel name and uid used to calculate
    // the token has to match the ones used for channel join
    // this.engine?.joinChannel(token, channelId, '', uid);
    this.engine?.joinChannelWithOptions(token, channelId, uid, {
      // Make myself as the broadcaster to send stream to remote
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  /**
   * Step 3-1: startRecording
   */
  startRecording = () => {
    const {
      channelId,
      uid,
      storagePath,
      containerFormat,
      streamType,
      maxDurationMs,
      recorderInfoUpdateInterval,
    } = this.state;
    this.engine
      ?.getMediaRecorder()
      .setMediaRecorderObserver({ channelId, localUid: uid }, this);
    this.engine?.getMediaRecorder().startRecording(
      { channelId, localUid: uid },
      {
        storagePath: `${storagePath}/${uid}.mp4`,
        containerFormat,
        streamType,
        maxDurationMs,
        recorderInfoUpdateInterval,
      }
    );
  };

  /**
   * Step 3-2: stopRecording
   */
  stopRecording = () => {
    const { channelId, uid } = this.state;
    this.engine?.getMediaRecorder().stopRecording({ channelId, localUid: uid });
  };

  /**
   * Step 4: leaveChannel
   */
  protected leaveChannel() {
    this.engine?.leaveChannel();
  }

  /**
   * Step 5: releaseRtcEngine
   */
  protected releaseRtcEngine() {
    this.engine?.unregisterEventHandler(this);
    this.engine?.release();
  }

  onRecorderInfoUpdated(info: RecorderInfo) {
    this.info('onRecorderInfoUpdated', 'info', info);
  }

  onRecorderStateChanged(state: RecorderState, error: RecorderErrorCode) {
    this.info('onRecorderStateChanged', 'state', state, 'error', error);
    switch (state) {
      case RecorderState.RecorderStateStart:
        this.setState({ startRecoding: true });
        break;
      case RecorderState.RecorderStateError:
      case RecorderState.RecorderStateStop:
        this.setState({ startRecoding: false });
        break;
    }
  }

  protected renderBottom(): React.ReactNode {
    const {
      storagePath,
      containerFormat,
      streamType,
      maxDurationMs,
      recorderInfoUpdateInterval,
    } = this.state;
    return (
      <>
        <AgoraTextInput
          onEndEditing={({ nativeEvent: { text } }) => {
            this.setState({ storagePath: text });
          }}
          placeholder={'storagePath'}
          value={storagePath}
        />
        <AgoraDropdown
          title={'containerFormat'}
          items={enumToItems(MediaRecorderContainerFormat)}
          value={containerFormat}
          onValueChange={(value) => {
            this.setState({ containerFormat: value });
          }}
        />
        <AgoraDivider />
        <AgoraDropdown
          title={'streamType'}
          items={enumToItems(MediaRecorderStreamType)}
          value={streamType}
          onValueChange={(value) => {
            this.setState({ streamType: value });
          }}
        />
        <AgoraDivider />
        <AgoraTextInput
          onEndEditing={({ nativeEvent: { text } }) => {
            if (isNaN(+text)) return;
            this.setState({ maxDurationMs: +text });
          }}
          keyboardType={
            Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'
          }
          placeholder={`maxDurationMs (defaults: ${
            this.createState().maxDurationMs
          })`}
          value={
            maxDurationMs === this.createState().maxDurationMs
              ? ''
              : maxDurationMs.toString()
          }
        />
        <AgoraSlider
          title={'recorderInfoUpdateInterval'}
          minimumValue={1000}
          maximumValue={10000}
          step={1}
          value={recorderInfoUpdateInterval}
          onSlidingComplete={(value) => {
            this.setState({ recorderInfoUpdateInterval: value });
          }}
        />
      </>
    );
  }

  protected renderFloat(): React.ReactNode {
    const { joinChannelSuccess, startRecoding } = this.state;
    return (
      <>
        <AgoraButton
          disabled={!joinChannelSuccess}
          title={`${startRecoding ? 'stop' : 'start'} Recording`}
          onPress={startRecoding ? this.stopRecording : this.startRecording}
        />
      </>
    );
  }
}
