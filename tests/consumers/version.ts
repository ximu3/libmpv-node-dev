import assert from 'node:assert/strict'
import { getClientApiVersion } from '@ximu3/libmpv-node'

const versions = await Promise.all([getClientApiVersion(), getClientApiVersion()])
assert.deepEqual(versions, [{ major: 2, minor: 6 }, { major: 2, minor: 6 }])
console.log(JSON.stringify({ host: process.versions.electron ?? process.version, versions }))
