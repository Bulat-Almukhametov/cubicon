export type Contest = {
    id: number,
    name: string,
    date: Date,
    vkLink: string,
    location: string,
    status: ContestStatus,
    organizedById: any,
    organizedBy: any,
    cityId: number,
    city: City,
    rounds: Round[],
}

export enum ContestStatus {
    NEW = 'NEW',
    EDITING_RESULTS = 'EDITING_RESULTS',
    PUBLISHED = 'PUBLISHED',
}

export type Round = {
    id: number,
    name: string,
    format: RoundFormat,
    results: Result[],
}

export type Result = {
    id: number,
    attempt1: number,
    attempt2: number,
    attempt3: number,
    attempt4: number,
    attempt5: number,
    best: number,
    average: number,
    performedBy: User,
    roundId: number,
}

export enum RoundFormat {
    AVERAGE_OF_5 = 'AVERAGE_OF_5',
    MEAN_OF_3 = 'MEAN_OF_3',
}

export type ContestListState = {
    isLoaded: boolean,
    contests: Contest[],
}

export interface Notification {
    message: string,
}

export type User = {
    id: number,
    firstName: string,
    lastName: string,
    cityId: number,
    city: City,
}

export type City = {
    id: number,
    name: string,
    regionId: number,
    region: Region,
}

export type Region = {
    id: number,
    name: string,
}

export type ErrorHandlerProps = {
    addNotification: (notification: Notification) => void,
}
