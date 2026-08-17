export function isValidNumber(value: any): boolean {
  return !isNaN(Number(value));
}

export function isValidBrand(value: any): boolean {
  return value === "HP" || value === "Samsung";
}