import { PrinterBrand } from "../types/printer";

class PrinterModel {
  private _id!: number;

  constructor(
    private _name: string,
    private _ip: string,
    private _serialNumber: string | undefined,
    private _groupId: number,
    private _brand: PrinterBrand,
    private _model: string,
    private _createdAt: Date
  ) {}

  get id() {
    return this._id;
  }

  set id(id: number) {
    this._id = id;
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get ip() {
    return this._ip;
  }

  set ip(ip: string) {
    this._ip = ip;
  }

  get serialNumber() {
    return this._serialNumber;
  }

  set serialNumber(serialNumber: string | undefined) {
    this._serialNumber = serialNumber;
  }

  get groupId() {
    return this._groupId;
  }

  set groupId(groupId: number) {
    this._groupId = groupId;
  }

  get brand() {
    return this._brand;
  }

  set brand(brand: PrinterBrand) {
    this._brand = brand;
  }

  get model() {
    return this._model;
  }

  set model(model: string) {
    this._model = model;
  }

  get createdAt() {
    return this._createdAt;
  }

  set createdAt(createdAt: Date) {
    this._createdAt = createdAt;
  }
}

export { PrinterModel };