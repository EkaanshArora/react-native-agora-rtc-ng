import React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngineEventHandler,
} from 'react-native-agora-rtc-ng';

import { ActionItem } from '../../../components/ActionItem';
import {
  BaseAudioComponentState,
  BaseComponent,
  Divider,
  STYLES,
  Input,
} from '../../../components/BaseComponent';
import Config from '../../../config/agora.config.json';

interface State extends BaseAudioComponentState {
  soundId: number;
  filePath: string;
  loopCount: number;
  pitch: number;
  pan: number;
  gain: number;
  publish: boolean;
  startPos: number;
  playEffect: boolean;
  pauseEffect: boolean;
}

export default class PlayEffect
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
      soundId: 0,
      filePath: this.getAssetPath('Sound_Horizon.mp3'),
      loopCount: 1,
      pitch: 1.0,
      pan: 0,
      gain: 100,
      publish: false,
      startPos: 0,
      playEffect: false,
      pauseEffect: false,
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
      // Need granted the microphone permission
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
    }

    // Only need to enable audio on this case
    this.engine.enableAudio();
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
   * Step 3-1: playEffect
   */
  playEffect = async () => {
    const {
      soundId,
      filePath,
      loopCount,
      pitch,
      pan,
      gain,
      publish,
      startPos,
    } = this.state;
    if (!filePath) {
      console.error('filePath is invalid');
      return;
    }
    if (startPos < 0) {
      console.error('startPos is invalid');
      return;
    }

    this.engine?.playEffect(
      soundId,
      await this.getAbsolutePath(filePath),
      loopCount,
      pitch,
      pan,
      gain,
      publish,
      startPos
    );
    this.setState({ playEffect: true, pauseEffect: false });
  };

  /**
   * Step 3-2 (Optional): pauseEffect
   */
  pauseEffect = () => {
    const { soundId } = this.state;
    this.engine?.pauseEffect(soundId);
    this.setState({ pauseEffect: true });
  };

  /**
   * Step 3-3 (Optional): resumeEffect
   */
  resumeEffect = () => {
    const { soundId } = this.state;
    this.engine?.resumeEffect(soundId);
    this.setState({ pauseEffect: false });
  };

  /**
   * Step 3-4: stopEffect
   */
  stopEffect = () => {
    const { soundId } = this.state;
    this.engine?.stopEffect(soundId);
    this.setState({ playEffect: false });
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
    this.engine?.release();
  }

  onAudioEffectFinished(soundId: number) {
    this.info('onAudioEffectFinished', 'soundId', soundId);
    this.setState({ playEffect: false });
  }

  protected renderBottom(): React.ReactNode {
    const {
      soundId,
      filePath,
      loopCount,
      pitch,
      pan,
      gain,
      publish,
      startPos,
    } = this.state;
    return (
      <>
        <Input
          style={STYLES.input}
          onEndEditing={({ nativeEvent: { text } }) => {
            if (isNaN(+text)) return;
            this.setState({ soundId: +text });
          }}
          keyboardType={
            Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'
          }
          placeholder={`soundId (defaults: ${this.createState().soundId})`}
          value={
            soundId === this.createState().soundId ? '' : soundId.toString()
          }
        />
        <Input
          style={STYLES.input}
          onEndEditing={({ nativeEvent: { text } }) => {
            this.setState({ filePath: text });
          }}
          placeholder={'filePath'}
          value={filePath}
        />
        <Input
          style={STYLES.input}
          onEndEditing={({ nativeEvent: { text } }) => {
            if (isNaN(+text)) return;
            this.setState({ loopCount: +text });
          }}
          keyboardType={
            Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'
          }
          placeholder={`loopCount (defaults: ${this.createState().loopCount})`}
          value={
            loopCount === this.createState().loopCount
              ? ''
              : loopCount.toString()
          }
        />
        {this.renderSlider('pitch', pitch, 0.5, 2.0, true)}
        <Divider />
        {this.renderSlider('pan', pan, -1.0, 1.0, true)}
        <Divider />
        {this.renderSlider('gain', gain, 0.0, 100.0, true)}
        <Divider />
        <ActionItem
          title={'publish'}
          isShowSwitch={true}
          switchValue={publish}
          onSwitchValueChange={(value) => {
            this.setState({ publish: value });
          }}
        />
        <Divider />
        <Input
          style={STYLES.input}
          onEndEditing={({ nativeEvent: { text } }) => {
            if (isNaN(+text)) return;
            this.setState({ startPos: +text });
          }}
          keyboardType={
            Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'
          }
          placeholder={`startPos (defaults: ${this.createState().startPos})`}
          value={
            startPos === this.createState().startPos ? '' : startPos.toString()
          }
        />
      </>
    );
  }

  protected renderFloat(): React.ReactNode {
    const { playEffect, pauseEffect } = this.state;
    return (
      <>
        <ActionItem
          title={`${playEffect ? 'stop' : 'play'} Effect`}
          onPress={playEffect ? this.stopEffect : this.playEffect}
        />
        <ActionItem
          disabled={!playEffect}
          title={`${pauseEffect ? 'resume' : 'pause'} Effect`}
          onPress={pauseEffect ? this.resumeEffect : this.pauseEffect}
        />
      </>
    );
  }
}
