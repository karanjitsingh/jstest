import ICommunicationManager from "../CommunicationUtils/ICommunicationManager";
import IEventDispatcher from "Events/IEventDispatcher";
import Event from "Events/Event";


export enum EnvironmentType {
    NodeJS,
    Browser
}

export default interface IEnvironment {
    readonly environmentType: EnvironmentType;
    readonly argv: Array<string>;
    readonly EventDispatcher: IEventDispatcher;
    createCommunicationManager(): ICommunicationManager;
    createEvent(): Event;
}