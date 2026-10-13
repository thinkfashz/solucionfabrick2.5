declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: 'CODE128' | 'CODE39' | 'EAN13' | string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
    background?: string;
    lineColor?: string;
  }
  function JsBarcode(
    image: HTMLCanvasElement | SVGElement | string,
    text: string,
    options?: JsBarcodeOptions,
  ): void;
  namespace JsBarcode {}
  export default JsBarcode;
}
