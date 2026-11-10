export enum ErrorCode {
    INTERNAL_ERROR = 'internalError',
    INVALID_MESSAGE = 'invalidMessage',
    ROOM_NOT_FOUND = 'roomNotFound',
    NOT_IN_ROOM = 'notInRoom',
    INCORRECT_PASSWORD = 'incorrectPassword',
    ROOM_CLOSED = 'roomClosed',
    NOT_CREATOR_OF_ROOM = 'notCreatorOfRoom',
    ALREADY_IN_QUEUE = 'alreadyInQueue',
    VIDEO_NOT_FOUND = 'videoNotFound',
    VIDEO_NOT_EMBEDDABLE = 'videoNotEmbeddable',
    REJOIN_ROOM_NOT_FOUND = 'rejoinRoomNotFound',
    ROOM_LOCKED = 'roomLocked',
    NOT_HOST = 'notHost',
    /** Playback controls are for the host and the person singing now. */
    NOT_YOUR_TURN = 'notYourTurn',
    /** Queued songs can be changed only by their singer (or the host). */
    NOT_YOUR_SONG = 'notYourSong',
}

export interface ErrorResponse {
    type: 'error' | 'errorWithCode';
    code?: ErrorCode;
    message?: string;
}

export class RoomError extends Error {
    constructor(
        public code: ErrorCode,
        message?: string,
    ) {
        super(message || getDefaultErrorMessage(code));
        this.name = 'RoomError';
    }
}

function getDefaultErrorMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
        [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred',
        [ErrorCode.INVALID_MESSAGE]: 'Invalid message received',
        [ErrorCode.ROOM_NOT_FOUND]: 'Room not found',
        [ErrorCode.NOT_IN_ROOM]: 'You are not in a room',
        [ErrorCode.INCORRECT_PASSWORD]: 'Incorrect room password',
        [ErrorCode.ROOM_CLOSED]: 'Room has been closed',
        [ErrorCode.NOT_CREATOR_OF_ROOM]: 'Only the room creator can perform this action',
        [ErrorCode.ALREADY_IN_QUEUE]: 'Video is already in queue',
        [ErrorCode.VIDEO_NOT_FOUND]: 'Video not found',
        [ErrorCode.VIDEO_NOT_EMBEDDABLE]: 'Video cannot be embedded',
        [ErrorCode.REJOIN_ROOM_NOT_FOUND]: 'Rejoin room not found',
        [ErrorCode.ROOM_LOCKED]: 'Room is locked — ask the host to unlock it',
        [ErrorCode.NOT_HOST]: 'Only the room host can perform this action',
        [ErrorCode.NOT_YOUR_TURN]: 'Only the host or the person singing can control playback',
        [ErrorCode.NOT_YOUR_SONG]: 'Only the singer who added this song can change it',
    };

    return messages[code];
}
