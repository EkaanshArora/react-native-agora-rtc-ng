import React from 'react';
import { PermissionsAndroid, Platform, StyleSheet } from 'react-native';
import {
  AudioScenarioType,
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngineEventHandler,
} from 'react-native-agora-rtc-ng';

import Config from '../../../config/agora.config.json';

import {
  BaseAudioComponentState,
  BaseComponent,
} from '../../../components/BaseComponent';
import {
  AgoraButton,
  AgoraDivider,
  AgoraDropdown,
  AgoraStyle,
  AgoraTextInput,
  AgoraView,
} from '../../../components/ui';
import { arrayToItems } from '../../../utils';

interface State extends BaseAudioComponentState {
  range: number;
  targetUid: number;
  position: number[];
  axisForward: number[];
  axisRight: number[];
  axisUp: number[];
}

export default class LocalSpatialAudioEngine
  extends BaseComponent<{}, State>
  implements IRtcEngineEventHandler
{
  protected createState(): State {
    return {
      appId: Config.appId,
      enableVideo: false,
      channelId: Config.channelId,
      token: Config.token,
      uid: Config.uid,
      joinChannelSuccess: false,
      remoteUsers: [],
      range: 50,
      targetUid: 0,
      position: [0, 0, 0],
      axisForward: [1, 0, 0],
      axisRight: [0, 1, 0],
      axisUp: [0, 0, 1],
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
      // ⚠️ Must use AudioScenarioGameStreaming on this case
      audioScenario: AudioScenarioType.AudioScenarioGameStreaming,
    });

    if (Platform.OS === 'android') {
      // Need granted the microphone permission
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
    }

    // ⚠️ Must call after initialize and before joinChannel
    if (Platform.OS === 'android') {
      this.engine?.loadExtensionProvider('agora_spatial_audio_extension');
    }

    // Only need to enable audio on this case
    this.engine.enableAudio();

    this.engine.setParameters(
      JSON.stringify({ 'rtc.audio.force_bluetooth_a2dp': true })
    );

    this.initializeLocalSpatialAudioEngine();
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
    this.engine?.joinChannelWithOptions(token, channelId, uid, {
      // Make myself as the broadcaster to send stream to remote
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  /**
   * Step 3-1: initializeLocalSpatialAudioEngine
   */
  initializeLocalSpatialAudioEngine = () => {
    this.engine?.getLocalSpatialAudioEngine().initialize();
  };

  /**
   * Step 3-2: setAudioRecvRange
   */
  setAudioRecvRange = () => {
    const { range } = this.state;
    this.engine?.getLocalSpatialAudioEngine().setAudioRecvRange(range);
  };

  /**
   * Step 3-3: setAudioRecvRange
   */
  updateSelfPosition = () => {
    const { position, axisForward, axisRight, axisUp } = this.state;
    this.engine
      ?.getLocalSpatialAudioEngine()
      .updateSelfPosition(position, axisForward, axisRight, axisUp);
  };

  /**
   * Step 3-4: updateRemotePosition
   */
  updateRemotePosition = () => {
    const { targetUid, position, axisForward } = this.state;
    this.engine?.getLocalSpatialAudioEngine().updateRemotePosition(targetUid, {
      position,
      forward: axisForward,
    });
  };

  /**
   * Step 3-5: releaseLocalSpatialAudioEngine
   */
  releaseLocalSpatialAudioEngine = () => {
    this.engine?.getLocalSpatialAudioEngine().release();
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
    this.releaseLocalSpatialAudioEngine();
    this.engine?.release();
  }

  protected renderBottom(): React.ReactNode {
    const {
      joinChannelSuccess,
      remoteUsers,
      range,
      targetUid,
      position,
      axisForward,
      axisRight,
      axisUp,
    } = this.state;
    return (
      <>
        <AgoraTextInput
          onEndEditing={({ nativeEvent: { text } }) => {
            if (isNaN(+text)) return;
            this.setState({ range: +text });
          }}
          keyboardType={
            Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'
          }
          placeholder={`range (defaults: ${this.createState().range})`}
          value={range === this.createState().range ? '' : range.toString()}
        />
        <AgoraButton
          disabled={!joinChannelSuccess}
          title={`set Audio Recv Range`}
          onPress={this.setAudioRecvRange}
        />
        <AgoraDivider />
        <AgoraDropdown
          title={'targetUid'}
          items={arrayToItems([0, ...remoteUsers])}
          value={targetUid}
          onValueChange={(value) => {
            this.setState({ targetUid: value });
          }}
        />
        <AgoraDivider />
        <AgoraView style={styles.container}>
          {position.map((value, index) => (
            <AgoraTextInput
              style={AgoraStyle.fullSize}
              onEndEditing={({ nativeEvent: { text } }) => {
                if (isNaN(+text)) return;
                position[index] = +text;
                this.setState({ position });
              }}
              keyboardType={
                Platform.OS === 'android'
                  ? 'numeric'
                  : 'numbers-and-punctuation'
              }
              placeholder={`position (defaults: ${
                this.createState().position[index]
              })`}
              value={
                position[index] === this.createState().position[index]
                  ? ''
                  : position[index].toString()
              }
            />
          ))}
        </AgoraView>
        <AgoraView style={styles.container}>
          {axisForward.map((value, index) => (
            <AgoraTextInput
              style={AgoraStyle.fullSize}
              onEndEditing={({ nativeEvent: { text } }) => {
                if (isNaN(+text)) return;
                axisForward[index] = +text;
                this.setState({ axisForward });
              }}
              keyboardType={
                Platform.OS === 'android'
                  ? 'numeric'
                  : 'numbers-and-punctuation'
              }
              placeholder={`axisForward (defaults: ${
                this.createState().axisForward[index]
              })`}
              value={
                axisForward[index] === this.createState().axisForward[index]
                  ? ''
                  : axisForward[index].toString()
              }
            />
          ))}
        </AgoraView>
        <AgoraView style={styles.container}>
          {axisRight.map((value, index) => (
            <AgoraTextInput
              style={AgoraStyle.fullSize}
              onEndEditing={({ nativeEvent: { text } }) => {
                if (isNaN(+text)) return;
                axisRight[index] = +text;
                this.setState({ axisRight });
              }}
              keyboardType={
                Platform.OS === 'android'
                  ? 'numeric'
                  : 'numbers-and-punctuation'
              }
              placeholder={`axisRight (defaults: ${
                this.createState().axisRight[index]
              })`}
              value={
                axisRight[index] === this.createState().axisRight[index]
                  ? ''
                  : axisRight[index].toString()
              }
            />
          ))}
        </AgoraView>
        <AgoraView style={styles.container}>
          {axisUp.map((value, index) => (
            <AgoraTextInput
              style={AgoraStyle.fullSize}
              onEndEditing={({ nativeEvent: { text } }) => {
                if (isNaN(+text)) return;
                axisUp[index] = +text;
                this.setState({ axisUp });
              }}
              keyboardType={
                Platform.OS === 'android'
                  ? 'numeric'
                  : 'numbers-and-punctuation'
              }
              placeholder={`axisUp (defaults: ${
                this.createState().axisUp[index]
              })`}
              value={
                axisUp[index] === this.createState().axisUp[index]
                  ? ''
                  : axisUp[index].toString()
              }
            />
          ))}
        </AgoraView>
      </>
    );
  }

  protected renderFloat(): React.ReactNode {
    const { joinChannelSuccess, targetUid } = this.state;
    return (
      <>
        <AgoraButton
          disabled={!joinChannelSuccess}
          title={`update ${targetUid === 0 ? 'Self' : 'Remote'} Position`}
          onPress={
            targetUid === 0
              ? this.updateSelfPosition
              : this.updateRemotePosition
          }
        />
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
