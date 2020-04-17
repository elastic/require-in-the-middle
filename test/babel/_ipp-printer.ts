import assert from 'assert'
import Printer from 'ipp-printer'

assert.strictEqual(Printer.patched, true)

const foo:number = 42

export default Printer
export { foo }
