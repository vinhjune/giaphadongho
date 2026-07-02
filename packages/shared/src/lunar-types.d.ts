// Minimal type declaration for lunar-javascript (no published @types package)
declare module 'lunar-javascript' {
  class Solar {
    getYear(): number
    getMonth(): number
    getDay(): number
  }
  class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar
    getSolar(): Solar
  }
  export = Lunar
}
