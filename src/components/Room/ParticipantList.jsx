import React from 'react';
import {
  RcList,
} from '@ringcentral/juno';

import { Participant } from './Participant';

export function ParticipantList({
  meetingController,
  participants,
  videoTrackMap,
  audioTrackMap
}) {
  return (
    <RcList>
      {participants.map(participant => (
        <Participant
          key={participant.uid}
          participant={participant}
          videoTrack={videoTrackMap[participant.uid]}
          audioTrack={audioTrackMap[participant.uid]}
          meetingController={meetingController}
        />
      ))}
    </RcList>
  );
}