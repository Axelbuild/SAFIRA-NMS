import { LinkMonitorType } from "../types/link";

export class LinkModel {
  id?: number;
  name: string;
  description?: string;
  enabled: boolean;
  capacity: number;
  groupId: number;
  createdAt: Date;
  updatedAt?: Date;

  constructor(
    name: string,
    capacity: number,
    groupId: number,
    description?: string,
    enabled: boolean = true,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.name = name;
    this.capacity = capacity;
    this.groupId = groupId;
    this.description = description;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export class LinkMonitorModel {
  id?: number;
  linkId: number;
  monitorType: LinkMonitorType;
  enabled: boolean;
  config: Record<string, any>;
  lastCheck?: Date;
  nextCheck?: Date;
  createdAt: Date;
  updatedAt?: Date;

  constructor(
    linkId: number,
    monitorType: LinkMonitorType,
    config: Record<string, any>,
    enabled: boolean = true,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.linkId = linkId;
    this.monitorType = monitorType;
    this.config = config;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
