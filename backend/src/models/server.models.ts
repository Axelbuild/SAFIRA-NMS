import { ServerOSType } from "../types/server";

export class ServerModel {
  id?: number;
  name: string;
  ip: string;
  osType: ServerOSType;
  hostname?: string;
  groupId: number;
  createdAt: Date;
  updatedAt?: Date;

  constructor(
    name: string,
    ip: string,
    osType: ServerOSType,
    groupId: number,
    hostname?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.name = name;
    this.ip = ip;
    this.osType = osType;
    this.groupId = groupId;
    this.hostname = hostname;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
