import React, { useState, useEffect, useRef } from 'react';
import {
    EngineEvent,
    ErrorCodeType,
    UserEvent,
    StreamEvent,
    AudioEvent,
    VideoEvent
} from '@ringcentral/video-sdk';
import { login } from './client';

import { Room } from './components/Room';
import { Menu } from './components/Menu';

function App({
    rcvEngine,
    rcSDK
}) {
    const [loggedIn, setLoggedIn] = useState(false);
    const [meetingController, setMeetingController] = useState(null);
    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [localParticipant, setLocalParticipant] = useState(null);
    const [videoTrackMap, setVideoTrackMap] = useState({});
    const videoTrackMapRef = useRef(videoTrackMap);
    const [audioTrackMap, setAudioTrackMap] = useState({});
    const audioTrackMapRef = useRef(audioTrackMap);

    function refreshParticipants() {
        const newMeetingController = rcvEngine.getMeetingController();
        const userController = newMeetingController.getUserController();
        const newParticipants = userController.getMeetingUsers();
        setParticipants(Object.values(newParticipants).filter(p => !p.isDeleted));
    }
    useEffect(() => {
        const checkUserLogin = async () => {
            const isLoggedIn = await rcSDK.platform().loggedIn();
            setLoggedIn(isLoggedIn);
        }
        checkUserLogin();

        chrome.runtime.onMessage.addListener(async (message) => {
            if (message.loginOptions) {
                const rcLoginResponse = await rcSDK.login(message.loginOptions);
                const rcLoginResponseJson = await rcLoginResponse.json();
                setLoggedIn(true);
                await login({ rcAccessToken: rcLoginResponseJson.access_token })
            }
        });

    }, []);

    useEffect(() => {
        videoTrackMapRef.current = videoTrackMap;
        audioTrackMapRef.current = audioTrackMap;
    }, [videoTrackMap, audioTrackMap]);

    useEffect(() => {
        const onParticipantsUpdated = () => {
            refreshParticipants();
        };
        const onMeetingJoined = async (meetingId, errorCode) => {
            if (errorCode === ErrorCodeType.ERR_OK) {
                const newMeetingController = rcvEngine.getMeetingController();
                setMeetingController(newMeetingController);
                const meetingInfo = await newMeetingController.getMeetingInfo();
                setRoom(meetingInfo);
                const userController = newMeetingController.getUserController();
                setParticipants(Object.values(userController.getMeetingUsers()));
                setLocalParticipant(userController.getMyself());
                userController.on(UserEvent.USER_JOINED, onParticipantsUpdated);
                userController.on(UserEvent.USER_LEFT, onParticipantsUpdated);
                userController.on(UserEvent.USER_UPDATED, onParticipantsUpdated);
                const streamManager = newMeetingController.getStreamManager();
                const onVideoTrackAdded = stream => {
                    setVideoTrackMap({
                        ...videoTrackMapRef.current,
                        [stream.participantId]: stream,
                    })
                };
                const onVideoTrackRemoved = stream => {
                    const newVideoTrackMap = {
                        ...videoTrackMapRef.current,
                    };
                    delete newVideoTrackMap[stream.participantId];
                    setVideoTrackMap(newVideoTrackMap)
                };
                const onAudioTrackAdded = stream => {
                    const newAudioTrackMap = {
                        ...audioTrackMapRef.current,
                        [stream.participantId]: stream,
                    };
                    setAudioTrackMap(newAudioTrackMap)
                };
                const onAudioTrackRemoved = stream => {
                    const newAudioTrackMap = {
                        ...audioTrackMapRef.current,
                    };
                    delete newAudioTrackMap[stream.participantId];
                    setAudioTrackMap(newAudioTrackMap)
                };
                streamManager.on(StreamEvent.LOCAL_VIDEO_TRACK_ADDED, onVideoTrackAdded);
                streamManager.on(StreamEvent.LOCAL_VIDEO_TRACK_REMOVED, onVideoTrackRemoved);
                streamManager.on(StreamEvent.REMOTE_VIDEO_TRACK_ADDED, onVideoTrackAdded);
                streamManager.on(StreamEvent.REMOTE_VIDEO_TRACK_REMOVED, onVideoTrackRemoved);
                streamManager.on(StreamEvent.LOCAL_AUDIO_TRACK_ADDED, onAudioTrackAdded);
                streamManager.on(StreamEvent.LOCAL_AUDIO_TRACK_REMOVED, onAudioTrackRemoved);
                streamManager.on(StreamEvent.REMOTE_AUDIO_TRACK_ADDED, onAudioTrackAdded);
                streamManager.on(StreamEvent.REMOTE_AUDIO_TRACK_REMOVED, onAudioTrackRemoved);

                const audioController = newMeetingController.getAudioController();
                const videoController = newMeetingController.getVideoController();
                audioController.on(AudioEvent.LOCAL_AUDIO_MUTE_CHANGED, (muted) => {
                    setLocalParticipant({
                        ...userController.getMyself(),
                        isAudioMuted: muted,
                    });
                });
                audioController.on(AudioEvent.REMOTE_AUDIO_MUTE_CHANGED, (uid, muted) => {
                    refreshParticipants();
                });
                audioController.on(AudioEvent.AUDIO_UNMUTE_DEMAND, () => {
                    setLocalParticipant({
                        ...userController.getMyself(),
                        isAudioMuted: false,
                    });
                });
                videoController.on(VideoEvent.LOCAL_VIDEO_MUTE_CHANGED, (muted) => {
                    setLocalParticipant({
                        ...userController.getMyself(),
                        isVideoMuted: muted,
                    });
                });
                videoController.on(VideoEvent.REMOTE_VIDEO_MUTE_CHANGED, (uid, muted) => {
                    refreshParticipants();
                });
                await audioController.enableAudio(true);
                console.log(meetingInfo);
                console.log(meetingInfo.meetingId);
            }
        };
        const onMeetingLeft = () => {
            setRoom(null);
            setMeetingController(null);
            setParticipants([]);
        };
        rcvEngine.on(EngineEvent.MEETING_JOINED, onMeetingJoined);
        rcvEngine.on(EngineEvent.MEETING_LEFT, onMeetingLeft);
        return () => {
            rcvEngine.off(EngineEvent.MEETING_JOINED, onMeetingJoined);
            rcvEngine.off(EngineEvent.MEETING_LEFT, onMeetingLeft);
        };
    }, [rcvEngine]);

    return (
        <div >
            {loggedIn &&
                <div>
                    <Menu
                        room={room}
                        localParticipant={localParticipant}
                        meetingController={meetingController}
                    />
                    {!!room &&
                        <Room
                            meetingController={meetingController}
                            participants={participants}
                            videoTrackMap={videoTrackMap}
                            audioTrackMap={audioTrackMap}
                        />
                    }
                </div>}
        </div>
    );
}


export default App;