import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface Answer_Key {
  id: UUIDString;
  __typename?: 'Answer_Key';
}

export interface CreateGameRoomData {
  gameRoom_insert: GameRoom_Key;
}

export interface CreateGameRoomVariables {
  name: string;
}

export interface CreateQuestionData {
  question_insert: Question_Key;
}

export interface CreateQuestionVariables {
  gameRoomId: UUIDString;
  text: string;
}

export interface GameRoom_Key {
  id: UUIDString;
  __typename?: 'GameRoom_Key';
}

export interface GameTurn_Key {
  id: UUIDString;
  __typename?: 'GameTurn_Key';
}

export interface ListGameRoomsData {
  gameRooms: ({
    id: UUIDString;
    name: string;
    hostUser: {
      id: UUIDString;
      username: string;
    } & User_Key;
  } & GameRoom_Key)[];
}

export interface ListQuestionsForGameRoomData {
  questions: ({
    id: UUIDString;
    text: string;
    user: {
      id: UUIDString;
      username: string;
    } & User_Key;
  } & Question_Key)[];
}

export interface ListQuestionsForGameRoomVariables {
  gameRoomId: UUIDString;
}

export interface Question_Key {
  id: UUIDString;
  __typename?: 'Question_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateGameRoom' Mutation. Allow users to execute without passing in DataConnect. */
export function createGameRoom(dc: DataConnect, vars: CreateGameRoomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGameRoomData>>;
/** Generated Node Admin SDK operation action function for the 'CreateGameRoom' Mutation. Allow users to pass in custom DataConnect instances. */
export function createGameRoom(vars: CreateGameRoomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGameRoomData>>;

/** Generated Node Admin SDK operation action function for the 'ListGameRooms' Query. Allow users to execute without passing in DataConnect. */
export function listGameRooms(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListGameRoomsData>>;
/** Generated Node Admin SDK operation action function for the 'ListGameRooms' Query. Allow users to pass in custom DataConnect instances. */
export function listGameRooms(options?: OperationOptions): Promise<ExecuteOperationResponse<ListGameRoomsData>>;

/** Generated Node Admin SDK operation action function for the 'CreateQuestion' Mutation. Allow users to execute without passing in DataConnect. */
export function createQuestion(dc: DataConnect, vars: CreateQuestionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateQuestionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateQuestion' Mutation. Allow users to pass in custom DataConnect instances. */
export function createQuestion(vars: CreateQuestionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateQuestionData>>;

/** Generated Node Admin SDK operation action function for the 'ListQuestionsForGameRoom' Query. Allow users to execute without passing in DataConnect. */
export function listQuestionsForGameRoom(dc: DataConnect, vars: ListQuestionsForGameRoomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListQuestionsForGameRoomData>>;
/** Generated Node Admin SDK operation action function for the 'ListQuestionsForGameRoom' Query. Allow users to pass in custom DataConnect instances. */
export function listQuestionsForGameRoom(vars: ListQuestionsForGameRoomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListQuestionsForGameRoomData>>;

